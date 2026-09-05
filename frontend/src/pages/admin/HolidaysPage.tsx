import { useState } from 'react';
import { toast } from 'sonner';
import { CalendarOff, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import PageHeader from '@/components/common/PageHeader';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyTableRow from '@/components/common/EmptyTableRow';
import SectionError from '@/components/common/SectionError';
import { apiError } from '@/lib/apiError';
import { formatDate } from '@/lib/formatDate';
import {
  useCreateHoliday,
  useDeleteHoliday,
  useHolidays,
  type HolidayDto,
} from '@/services/holidays.api';

const todayIso = () => new Date().toISOString().slice(0, 10);

function HolidaysPage() {
  const holidays = useHolidays();
  const createMut = useCreateHoliday();
  const deleteMut = useDeleteHoliday();

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [reason, setReason] = useState('');
  const [toDelete, setToDelete] = useState<HolidayDto | null>(null);

  const openNew = () => {
    setDate(todayIso());
    setReason('');
    setOpen(true);
  };

  const save = async () => {
    if (!date) return toast.error('Please pick a date');
    try {
      await createMut.mutateAsync({ date, reason: reason.trim() || undefined });
      toast.success('Holiday added');
      setOpen(false);
    } catch (err) {
      toast.error(apiError(err, 'Could not add holiday'));
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await deleteMut.mutateAsync(toDelete.id);
      toast.success('Holiday removed');
      setToDelete(null);
    } catch (err) {
      toast.error(apiError(err, 'Delete failed'));
    }
  };

  const sorted = [...(holidays.data ?? [])].sort((a, b) =>
    a.holiday_date.localeCompare(b.holiday_date)
  );

  return (
    <div>
      <PageHeader
        title="Holidays"
        description="Dates the salon is fully closed — customers can't book any service or stylist on these days."
        actions={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Add holiday
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          {holidays.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : holidays.isError ? (
            <SectionError
              message="Couldn't load holidays right now."
              onRetry={() => holidays.refetch()}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 && (
                  <EmptyTableRow colSpan={3} message="No holidays scheduled." />
                )}
                {sorted.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{formatDate(h.holiday_date)}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-muted-foreground">
                      {h.reason || <span className="italic">No reason given</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Remove"
                        aria-label={`Remove holiday on ${h.holiday_date}`}
                        onClick={() => setToDelete(h)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5" /> Add holiday
            </DialogTitle>
            <DialogDescription>
              The salon will be closed to booking for the whole day, across every stylist and
              service.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="holiday-date">Date</Label>
              <Input
                id="holiday-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-reason">Reason (optional)</Label>
              <Input
                id="holiday-reason"
                placeholder="e.g. Diwali"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={createMut.isPending}>
              Add holiday
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        title="Remove this holiday?"
        description={
          toDelete
            ? `${formatDate(toDelete.holiday_date)} will be open for booking again.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        loading={deleteMut.isPending}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

export default HolidaysPage;
