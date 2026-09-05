import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, Loader2, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import PageHeader from '@/components/common/PageHeader';
import EmptyTableRow from '@/components/common/EmptyTableRow';
import { apiError } from '@/lib/apiError';
import { imageUrl } from '@/lib/imageUrl';
import { TIME_SLOTS } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { formatCreatedAt, formatTime } from '@/lib/formatDate';
import { digitsOnly, lettersOnly, nameInputProps, phoneInputProps } from '@/lib/inputHelpers';
import { ROUTES } from '@/constants/routes';
import { useCreateWalkInCustomer, useCustomers } from '@/services/users.api';
import { useServices } from '@/services/services.api';
import { useStaff } from '@/services/staff.api';

// -------- Walk-in dialog --------

function AddWalkInDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const services = useServices();
  const staff = useStaff();
  const createMut = useCreateWalkInCustomer();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [logVisit, setLogVisit] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [staffId, setStaffId] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('10:00');
  const [notes, setNotes] = useState('');

  const reset = () => {
    setName('');
    setEmail('');
    setPhone('');
    setLogVisit(false);
    setSelectedServiceIds([]);
    setStaffId('');
    setDate(new Date().toISOString().slice(0, 10));
    setStartTime('10:00');
    setNotes('');
  };

  const toggleService = (id: string) =>
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const submit = async () => {
    if (name.trim().length < 2) return toast.error('Please enter customer name');

    const payload: Parameters<typeof createMut.mutateAsync>[0] = {
      name,
      email: email || undefined,
      phone: phone || undefined,
    };
    if (logVisit) {
      if (selectedServiceIds.length === 0)
        return toast.error('Pick at least one service or turn off "log visit"');
      payload.visit = {
        serviceIds: selectedServiceIds,
        staffId: staffId || null,
        date,
        startTime,
        notes: notes || undefined,
      };
    }

    try {
      await createMut.mutateAsync(payload);
      toast.success(logVisit ? 'Customer added and visit logged' : 'Customer added');
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(apiError(err, 'Could not add customer'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add walk-in customer</DialogTitle>
          <DialogDescription>
            For walk-ins who came without an appointment. Only name is required — everything else is
            optional.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wi-name">Full name *</Label>
              <Input
                id="wi-name"
                value={name}
                {...nameInputProps}
                onChange={(e) => setName(lettersOnly(e.target.value))}
                placeholder="Priya Sharma"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wi-phone">Phone</Label>
              <Input
                id="wi-phone"
                value={phone}
                {...phoneInputProps}
                onChange={(e) => setPhone(digitsOnly(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wi-email">Email (optional)</Label>
            <Input
              id="wi-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Leave blank if the customer has no email"
            />
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">Also log a service visit?</p>
              <p className="text-sm text-muted-foreground">
                Records what services they took, from whom, and when.
              </p>
            </div>
            <Switch checked={logVisit} onCheckedChange={setLogVisit} />
          </div>

          {logVisit && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label>Services taken</Label>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                  {services.data?.map((s) => {
                    const active = selectedServiceIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleService(s.id)}
                        className={cn(
                          'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm',
                          active ? 'bg-primary/10 text-foreground' : 'hover:bg-accent'
                        )}
                      >
                        <span>{s.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {s.duration_minutes} min · ₹{Number(s.price_inr).toLocaleString('en-IN')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Staff who attended</Label>
                  <Select value={staffId} onValueChange={setStaffId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any / unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.data?.map((s) => (
                        <SelectItem key={s.user_id} value={s.user_id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Start time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {formatTime(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wi-notes">Notes</Label>
                <Textarea
                  id="wi-notes"
                  rows={2}
                  placeholder="Anything worth remembering"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={createMut.isPending}>
            {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------- Main page --------

function CustomersPage() {
  const [q, setQ] = useState('');
  const { data, isLoading } = useCustomers();
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        c.email.toLowerCase().includes(q.toLowerCase()) ||
        (c.phone ?? '').includes(q)
    );
  }, [data, q]);

  return (
    <div>
      <PageHeader
        title="Customers"
        description="All registered customers, sorted by lifetime value."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add walk-in
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, email, or phone…"
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Visits</TableHead>
                  <TableHead>Lifetime value</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <EmptyTableRow
                    colSpan={6}
                    message={q ? 'No customers match your search.' : 'No customers yet.'}
                  />
                )}
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="max-w-[220px]">
                      <div className="flex items-center gap-3">
                        <Avatar className="flex-shrink-0">
                          <AvatarImage src={imageUrl(c.avatar_url)} alt={c.name} />
                          <AvatarFallback>{c.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{c.phone ?? '—'}</TableCell>
                    <TableCell>{formatCreatedAt(c.created_at)}</TableCell>
                    <TableCell>{c.visits}</TableCell>
                    <TableCell className="font-semibold">
                      ₹{Number(c.lifetime_inr).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={ROUTES.adminCustomerProfile(c.id)}>
                          <Eye className="mr-1 h-4 w-4" /> View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddWalkInDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

export default CustomersPage;
