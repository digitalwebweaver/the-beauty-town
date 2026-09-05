import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Ban, ExternalLink, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
import SectionError from '@/components/common/SectionError';
import Pagination from '@/components/common/Pagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { apiError } from '@/lib/apiError';
import { formatInr } from '@/lib/formatCurrency';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useStaff } from '@/services/staff.api';
import { useSales, useVoidSale, type SaleListItemDto, type SaleStatus } from '@/services/sales.api';

const PAGE_SIZE = 20;
const ALL = '__all__';

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  };
}

function SalesHistoryPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q);
  const [status, setStatus] = useState<SaleStatus | typeof ALL>(ALL);
  const [staffId, setStaffId] = useState(ALL);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [toVoid, setToVoid] = useState<SaleListItemDto | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const staff = useStaff({ includeInactive: true });
  const voidMut = useVoidSale();

  // Staff always come back scoped to their own till server-side regardless
  // of what staffId is sent — the admin-only staff filter below is simply
  // never rendered for a staff caller, not something the server needs to
  // additionally enforce here.
  const sales = useSales({
    q: debouncedQ || undefined,
    status: status === ALL ? undefined : status,
    staffId: isAdmin && staffId !== ALL ? staffId : undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const filterKey = `${debouncedQ}|${status}|${staffId}|${from}|${to}`;
  const [appliedFilterKey, setAppliedFilterKey] = useState(filterKey);
  if (filterKey !== appliedFilterKey) {
    setAppliedFilterKey(filterKey);
    if (page !== 1) setPage(1);
  }

  const all = sales.data ?? [];
  const paged = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const confirmVoid = async () => {
    if (!toVoid) return;
    try {
      await voidMut.mutateAsync({ id: toVoid.id, reason: voidReason.trim() || undefined });
      toast.success('Sale voided');
      setToVoid(null);
      setVoidReason('');
    } catch (err) {
      toast.error(apiError(err, 'Void failed'));
    }
  };

  return (
    <div>
      <PageHeader
        title="Sales"
        description={
          isAdmin
            ? 'Every bill rung up at the salon — search, filter, and open any one for the full breakdown.'
            : 'Bills you’ve rung up — search, filter, and open any one for the full breakdown.'
        }
      />

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by customer or stylist…"
                className="pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                type="date"
                className="w-full sm:w-40"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                title="From date"
              />
              <Input
                type="date"
                className="w-full sm:w-40"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                title="To date"
              />
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
              {isAdmin && (
                <Select value={staffId} onValueChange={setStaffId}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Stylist" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All stylists</SelectItem>
                    {staff.data?.map((s) => (
                      <SelectItem key={s.user_id} value={s.user_id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {sales.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : sales.isError ? (
            <SectionError
              message="Couldn't load sales right now."
              onRetry={() => sales.refetch()}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      {isAdmin && <TableHead>Stylist</TableHead>}
                      <TableHead>Items</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.length === 0 && (
                      <EmptyTableRow
                        colSpan={isAdmin ? 8 : 7}
                        message={
                          q || status !== ALL || staffId !== ALL || from || to
                            ? 'No sales match your filters.'
                            : 'No sales yet.'
                        }
                      />
                    )}
                    {paged.map((s) => {
                      const { date, time } = formatDateTime(s.created_at);
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            <p>{date}</p>
                            <p className="text-xs text-muted-foreground">{time}</p>
                          </TableCell>
                          <TableCell className="font-medium">
                            {s.customer_name || 'Walk-in guest'}
                          </TableCell>
                          {isAdmin && <TableCell>{s.staff_name ?? '—'}</TableCell>}
                          <TableCell>{s.item_count}</TableCell>
                          <TableCell>
                            {Number(s.discount_inr) > 0 ? `−${formatInr(s.discount_inr)}` : '—'}
                          </TableCell>
                          <TableCell className="font-medium">{formatInr(s.total_inr)}</TableCell>
                          <TableCell>
                            {s.status === 'void' ? (
                              <Badge variant="outline" className="text-destructive">
                                Void
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                                Completed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex gap-1">
                              <Button variant="outline" size="sm" asChild>
                                <Link to={ROUTES.invoice(s.id)} target="_blank">
                                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View
                                </Link>
                              </Button>
                              {isAdmin && s.status !== 'void' && (
                                <Button
                                  variant="ghost"
                                  size="icon-lg"
                                  title="Void sale"
                                  aria-label={`Void sale for ${s.customer_name || 'walk-in guest'}`}
                                  onClick={() => setToVoid(s)}
                                >
                                  <Ban className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                className="mt-4"
                page={page}
                pageSize={PAGE_SIZE}
                total={all.length}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!toVoid}
        onOpenChange={(o) => {
          if (!o) {
            setToVoid(null);
            setVoidReason('');
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Void this sale?</DialogTitle>
            <DialogDescription>
              {toVoid &&
                `${formatInr(toVoid.total_inr)} for ${toVoid.customer_name || 'walk-in guest'} will be marked void, and any product stock it used gets restocked. This can't be undone.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="void-reason">Reason (optional)</Label>
            <Textarea
              id="void-reason"
              rows={2}
              placeholder="e.g. Rung up by mistake"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setToVoid(null);
                setVoidReason('');
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmVoid} disabled={voidMut.isPending}>
              {voidMut.isPending ? 'Voiding…' : 'Void sale'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SalesHistoryPage;
