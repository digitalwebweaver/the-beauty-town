import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Star, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiError } from '@/lib/apiError';
import { imageUrl } from '@/lib/imageUrl';
import { formatDate, formatTime } from '@/lib/formatDate';
import { cn } from '@/lib/utils';
import { useAvailableStaff } from '@/services/staff.api';
import { useTransferAppointment } from '@/services/appointments.api';

export interface TransferTarget {
  id: string;
  customer_name?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  service_names: string[];
  staff_name?: string | null;
  staff_id?: string | null;
}

interface Props {
  appointment: TransferTarget | null;
  onClose: () => void;
  currentStaffId?: string | null;
}

/**
 * Transfer an appointment from one staff to another when the assigned
 * staff cannot attend (leave, emergency, etc.). Shows only staff who are
 * ACTUALLY FREE in the appointment's exact time window, so the admin/staff
 * doesn't accidentally pick someone with a conflict.
 */
function TransferDialog({ appointment, onClose, currentStaffId }: Props) {
  const [pickedStaffId, setPickedStaffId] = useState<string | null>(null);
  const transferMut = useTransferAppointment();

  const excludeId = currentStaffId ?? appointment?.staff_id ?? undefined;
  const { data: candidates, isLoading } = useAvailableStaff({
    date: appointment?.appointment_date,
    startTime: appointment?.start_time,
    endTime: appointment?.end_time,
    excludeStaffId: excludeId ?? undefined,
  });

  const doTransfer = async () => {
    if (!appointment || !pickedStaffId) return;
    try {
      await transferMut.mutateAsync({
        id: appointment.id,
        newStaffId: pickedStaffId,
      });
      toast.success('Appointment transferred');
      setPickedStaffId(null);
      onClose();
    } catch (err) {
      toast.error(apiError(err, 'Transfer failed'));
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPickedStaffId(null);
      onClose();
    }
  };

  return (
    <Dialog open={!!appointment} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer appointment</DialogTitle>
          <DialogDescription>
            Pick a stylist who is free in the same time slot. Only staff without a conflict are
            shown.
          </DialogDescription>
        </DialogHeader>

        {appointment && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="font-medium">{appointment.customer_name ?? 'Appointment'}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {appointment.service_names.join(' + ')}
              </p>
              <p className="mt-1 text-sm">
                {formatDate(appointment.appointment_date)} · {formatTime(appointment.start_time)} –{' '}
                {formatTime(appointment.end_time)}
              </p>
              {appointment.staff_name && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Currently with:{' '}
                  <span className="font-medium text-foreground">{appointment.staff_name}</span>
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                Available stylists
              </p>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 rounded-lg" />
                  <Skeleton className="h-12 rounded-lg" />
                  <Skeleton className="h-12 rounded-lg" />
                </div>
              ) : !candidates || candidates.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  <UserCog className="h-4 w-4" />
                  No other staff is free during that time window.
                </div>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {candidates.map((s) => {
                    const active = pickedStaffId === s.user_id;
                    return (
                      <button
                        key={s.user_id}
                        type="button"
                        onClick={() => setPickedStaffId(s.user_id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg border p-3 text-left',
                          active ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                        )}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={imageUrl(s.avatar_url)} alt={s.name} />
                          <AvatarFallback>{s.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.role_title}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {Number(s.rating).toFixed(1)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={doTransfer} disabled={!pickedStaffId || transferMut.isPending}>
            {transferMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TransferDialog;
