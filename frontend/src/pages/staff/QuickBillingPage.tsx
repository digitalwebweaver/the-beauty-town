import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Check,
  Copy,
  FileText,
  Gift,
  Loader2,
  Minus,
  Package,
  Plus,
  Printer,
  Receipt,
  Search,
  Share2,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { ROUTES } from '@/constants/routes';
import api from '@/lib/axios';
import { apiError } from '@/lib/apiError';
import { formatInr } from '@/lib/formatCurrency';
import { formatTime } from '@/lib/formatDate';
import { useSettings, SETTINGS_FALLBACK } from '@/services/settings.api';
import { cn } from '@/lib/utils';
import { digitsOnly, lettersOnly, nameInputProps, phoneInputProps } from '@/lib/inputHelpers';
import { useServices } from '@/services/services.api';
import { useProducts } from '@/services/products.api';
import { usePackages } from '@/services/packages.api';
import { useAllAppointments } from '@/services/appointments.api';
import { useCustomers, type CustomerRow } from '@/services/users.api';
import {
  useCreateSale,
  type CreateSalePaymentInput,
  type PaymentMethod,
  type SaleDetailDto,
} from '@/services/sales.api';
import { useValidateCoupon } from '@/services/coupons.api';

type ItemType = 'service' | 'product' | 'package';

interface CartLine {
  key: string;
  type: ItemType;
  refId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  discountInr: number;
  maxStock?: number;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
};

function QuickBillingPage() {
  const qc = useQueryClient();

  // Entry point: a fresh walk-in ticket, an existing customer's account, or
  // checking out today's booking.
  const [mode, setMode] = useState<'walkin' | 'existing' | 'appointment'>('walkin');
  const [apptSearch, setApptSearch] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [loadingAppointment, setLoadingAppointment] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // Customer — typed directly for a walk-in, auto-filled from the booking.
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [itemTab, setItemTab] = useState<ItemType>('service');
  const [itemSearch, setItemSearch] = useState('');

  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountMode, setDiscountMode] = useState<'flat' | 'percent'>('flat');
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState('');

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountInr: number } | null>(
    null
  );
  const validateCoupon = useValidateCoupon();

  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payments, setPayments] = useState<{ method: PaymentMethod; amountInr: number }[]>([
    { method: 'cash', amountInr: 0 },
  ]);
  const [receipt, setReceipt] = useState<SaleDetailDto | null>(null);
  const [printFormat, setPrintFormat] = useState<'pos' | 'a4' | null>(null);

  const services = useServices();
  const products = useProducts();
  const packages = usePackages();
  const todaysAppointments = useAllAppointments();
  const customers = useCustomers({ enabled: mode === 'existing' });
  const createSale = useCreateSale();
  const settings = useSettings().data ?? SETTINGS_FALLBACK;

  const today = new Date().toISOString().slice(0, 10);
  const billableAppointments = useMemo(
    () =>
      (todaysAppointments.data ?? []).filter(
        (a) =>
          a.appointment_date === today && ['pending', 'confirmed', 'in_progress'].includes(a.status)
      ),
    [todaysAppointments.data, today]
  );
  const filteredAppointments = useMemo(() => {
    if (!apptSearch) return billableAppointments;
    const q = apptSearch.toLowerCase();
    return billableAppointments.filter(
      (a) =>
        (a.customer_name ?? '').toLowerCase().includes(q) ||
        a.service_names.some((s) => s.toLowerCase().includes(q))
    );
  }, [billableAppointments, apptSearch]);

  // Both filters below run against the full in-memory catalog/customer list
  // on every keystroke (no network request — this is a live-updating POS
  // cart, not a server-paginated table) — debounced so a fast typist
  // doesn't force a re-filter of a large list on every single character.
  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 150);
  const debouncedItemSearch = useDebouncedValue(itemSearch, 150);

  const filteredCustomers = useMemo(() => {
    const list = customers.data ?? [];
    if (!debouncedCustomerSearch) return list.slice(0, 30);
    const q = debouncedCustomerSearch.toLowerCase();
    return list
      .filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q))
      .slice(0, 30);
  }, [customers.data, debouncedCustomerSearch]);

  const activeServices = useMemo(
    () => (services.data ?? []).filter((s) => s.is_active),
    [services.data]
  );
  const activeProducts = useMemo(
    () => (products.data ?? []).filter((p) => p.is_active),
    [products.data]
  );
  const activePackages = useMemo(() => packages.data ?? [], [packages.data]);
  const shownServices = useMemo(
    () =>
      activeServices.filter((s) =>
        s.name.toLowerCase().includes(debouncedItemSearch.toLowerCase())
      ),
    [activeServices, debouncedItemSearch]
  );
  const shownProducts = useMemo(
    () =>
      activeProducts.filter((p) =>
        p.name.toLowerCase().includes(debouncedItemSearch.toLowerCase())
      ),
    [activeProducts, debouncedItemSearch]
  );
  const shownPackages = useMemo(
    () =>
      activePackages.filter((p) =>
        p.name.toLowerCase().includes(debouncedItemSearch.toLowerCase())
      ),
    [activePackages, debouncedItemSearch]
  );

  function switchMode(next: 'walkin' | 'existing' | 'appointment') {
    setMode(next);
    setSelectedAppointmentId(null);
    setCustomerSearch('');
    setCart([]);
    setCustomerId(null);
    setCustomerName('');
    setCustomerPhone('');
    setAppliedCoupon(null);
    setCouponInput('');
  }

  function selectExistingCustomer(c: CustomerRow) {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone ?? '');
  }

  function addToCart(
    type: ItemType,
    refId: string,
    name: string,
    unitPrice: number,
    maxStock?: number
  ) {
    setCart((prev) => {
      const key = `${type}:${refId}`;
      const idx = prev.findIndex((l) => l.key === key);
      if (idx >= 0) {
        const line = prev[idx];
        const nextQty = line.quantity + 1;
        if (line.maxStock !== undefined && nextQty > line.maxStock) {
          toast.error(`Only ${line.maxStock} left in stock`);
          return prev;
        }
        const next = [...prev];
        next[idx] = { ...line, quantity: nextQty };
        return next;
      }
      if (maxStock !== undefined && maxStock < 1) {
        toast.error('Out of stock');
        return prev;
      }
      return [
        ...prev,
        { key, type, refId, name, unitPrice, quantity: 1, discountInr: 0, maxStock },
      ];
    });
  }

  function setQty(key: string, qty: number) {
    setCart((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const clamped = Math.max(1, l.maxStock !== undefined ? Math.min(qty, l.maxStock) : qty);
        return { ...l, quantity: clamped };
      })
    );
  }

  function setUnitPrice(key: string, value: number) {
    setCart((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const nextUnitPrice = Math.max(0, value);
        // Re-clamp the discount so it can never end up bigger than the new,
        // possibly-lower, line total — the backend rejects that outright.
        const gross = round2(nextUnitPrice * l.quantity);
        return { ...l, unitPrice: nextUnitPrice, discountInr: Math.min(l.discountInr, gross) };
      })
    );
  }

  function setLineDiscount(key: string, value: number) {
    setCart((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const gross = round2(l.unitPrice * l.quantity);
        return { ...l, discountInr: Math.max(0, Math.min(value, gross)) };
      })
    );
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  function resetTicket() {
    setMode('walkin');
    setSelectedAppointmentId(null);
    setCart([]);
    setCustomerId(null);
    setCustomerName('');
    setCustomerPhone('');
    setDiscountMode('flat');
    setDiscountValue(0);
    setNotes('');
    setApptSearch('');
    setCustomerSearch('');
    setAppliedCoupon(null);
    setCouponInput('');
  }

  async function selectAppointment(id: string) {
    setSelectedAppointmentId(id);
    setLoadingAppointment(true);
    try {
      const detail = await qc.fetchQuery({
        queryKey: ['appointments', 'detail', id],
        queryFn: async () => (await api.get(`/appointments/${id}`)).data.data,
      });
      setCart(
        detail.services.map((s: { id: string; name: string; price: string }): CartLine => ({
          key: `service:${s.id}`,
          type: 'service',
          refId: s.id,
          name: s.name,
          unitPrice: Number(s.price),
          quantity: 1,
          discountInr: 0,
        }))
      );
      setCustomerId(detail.customer_id ?? null);
      setCustomerName(detail.customer_name ?? '');
      setCustomerPhone(detail.customer_phone ?? '');
    } catch (err) {
      toast.error(apiError(err, "Couldn't load that appointment"));
      setSelectedAppointmentId(null);
    } finally {
      setLoadingAppointment(false);
    }
  }

  const subtotal = round2(cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
  const itemDiscountTotal = round2(cart.reduce((s, l) => s + l.discountInr, 0));
  const billDiscountInr =
    discountMode === 'flat'
      ? Math.max(0, discountValue)
      : round2((subtotal * Math.max(0, Math.min(discountValue, 100))) / 100);
  const couponDiscountInr = appliedCoupon?.discountInr ?? 0;
  const totalDiscount = Math.min(
    subtotal,
    round2(itemDiscountTotal + billDiscountInr + couponDiscountInr)
  );
  const total = round2(Math.max(0, subtotal - totalDiscount));

  const paid = round2(payments.reduce((s, p) => s + (p.amountInr || 0), 0));
  const remaining = round2(total - paid);
  const isSettled = Math.abs(remaining) < 0.01;

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    if (!cart.length) return toast.error('Add items to the cart first');
    try {
      const result = await validateCoupon.mutateAsync({
        code,
        subtotalInr: subtotal,
        items: cart.map((l) => ({
          type: l.type,
          id: l.refId,
          lineTotalInr: round2(l.unitPrice * l.quantity - l.discountInr),
        })),
        customerPhone: customerPhone || undefined,
      });
      if (!result.valid) {
        toast.error(result.reason ?? "That coupon can't be applied");
        return;
      }
      setAppliedCoupon({ code, discountInr: result.discountInr });
      toast.success(`Coupon ${code} applied — −${formatInr(result.discountInr)}`);
    } catch (err) {
      toast.error(apiError(err, 'Could not check that coupon'));
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput('');
  }

  function openPayment() {
    if (!cart.length) return toast.error('Add at least one item first');
    setPayments([{ method: 'cash', amountInr: total }]);
    setPayDialogOpen(true);
  }

  function addSplit() {
    if (payments.length >= 3) return;
    const already = round2(payments.reduce((s, p) => s + p.amountInr, 0));
    const rest = Math.max(0, round2(total - already));
    setPayments((prev) => [...prev, { method: 'card', amountInr: rest }]);
  }

  function updatePayment(i: number, patch: Partial<{ method: PaymentMethod; amountInr: number }>) {
    setPayments((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function removePayment(i: number) {
    setPayments((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function confirmSale() {
    if (!isSettled) {
      toast.error(
        remaining > 0
          ? `₹${remaining.toFixed(2)} still unpaid`
          : `Payments exceed the total by ₹${Math.abs(remaining).toFixed(2)}`
      );
      return;
    }
    try {
      const sale = await createSale.mutateAsync({
        appointmentId: selectedAppointmentId ?? undefined,
        customerId: customerId ?? undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        items: cart.map((l) => ({
          type: l.type,
          id: l.refId,
          quantity: l.quantity,
          discountInr: l.discountInr,
          // Only honored by the backend when the "Allow price editing"
          // setting is on — safe to always send, edited or not.
          unitPriceInr: l.unitPrice,
        })),
        discountInr: billDiscountInr,
        couponCode: appliedCoupon?.code,
        payments: payments
          .filter((p) => p.amountInr > 0)
          .map<CreateSalePaymentInput>((p) => ({
            method: p.method,
            amountInr: p.amountInr,
          })),
        notes: notes.trim() || undefined,
      });
      toast.success(`Sale complete — ${formatInr(sale.total_inr)}`);
      setPayDialogOpen(false);
      setReceipt(sale);
      setPrintFormat(null);
      resetTicket();
    } catch (err) {
      toast.error(apiError(err, 'Could not complete the sale'));
      // The cart may have changed since the coupon was checked (backend
      // re-validates authoritatively) — clear it so staff isn't stuck
      // retrying with a coupon that just got rejected.
      if (appliedCoupon) setAppliedCoupon(null);
    }
  }

  // The two print formats need different physical page sizes — a POS
  // slip is one narrow continuous strip, an invoice is a normal A4 page.
  // @page can't be scoped by a class, so we rewrite it on the fly right
  // before printing, depending on which button was pressed.
  function printReceipt(format: 'pos' | 'a4') {
    let styleEl = document.getElementById('qb-print-page-size') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'qb-print-page-size';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent =
      format === 'pos'
        ? '@page { size: 80mm auto; margin: 4mm; }'
        : '@page { size: A4; margin: 15mm; }';

    setPrintFormat(format);
    // Give React a tick to mount the chosen printable layout before
    // the browser snapshots the page for printing.
    setTimeout(() => window.print(), 50);
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <PageHeader
        title="Quick Bill"
        description="Ring up a walk-in or check out a booking — built for speed at the front desk."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="space-y-4">
          {/* Entry point + customer / appointment */}
          <Card>
            <CardContent className="space-y-4 p-4 md:p-5">
              <div className="inline-flex flex-wrap rounded-lg border p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'walkin' ? 'default' : 'ghost'}
                  onClick={() => switchMode('walkin')}
                >
                  New walk-in
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'existing' ? 'default' : 'ghost'}
                  onClick={() => switchMode('existing')}
                >
                  Existing customer
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'appointment' ? 'default' : 'ghost'}
                  onClick={() => switchMode('appointment')}
                >
                  From an appointment
                </Button>
              </div>

              {mode === 'walkin' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="qb-name">Customer name</Label>
                    <Input
                      id="qb-name"
                      value={customerName}
                      {...nameInputProps}
                      onChange={(e) => setCustomerName(lettersOnly(e.target.value))}
                      placeholder="Optional — leave blank for a guest"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qb-phone">Phone</Label>
                    <Input
                      id="qb-phone"
                      value={customerPhone}
                      {...phoneInputProps}
                      onChange={(e) => setCustomerPhone(digitsOnly(e.target.value))}
                    />
                  </div>
                </div>
              ) : mode === 'existing' ? (
                customerId ? (
                  <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/5 p-3">
                    <div>
                      <p className="text-sm font-medium">{customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {customerPhone || 'No phone on file'}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => switchMode('existing')}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or phone…"
                        className="pl-9"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-64 space-y-1.5 overflow-y-auto">
                      {customers.isLoading &&
                        Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-14 rounded-lg" />
                        ))}
                      {!customers.isLoading && filteredCustomers.length === 0 && (
                        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                          {customerSearch
                            ? 'No customer matches that search.'
                            : 'No registered customers yet.'}
                        </p>
                      )}
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectExistingCustomer(c)}
                          className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left hover:bg-accent"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{c.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {c.phone ?? 'No phone'} · {c.visits} visit
                              {c.visits === 1 ? '' : 's'}
                            </p>
                          </div>
                          <span className="whitespace-nowrap text-xs font-medium text-primary">
                            {formatInr(c.lifetime_inr)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              ) : selectedAppointmentId ? (
                <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/5 p-3">
                  <div>
                    <p className="text-sm font-medium">{customerName || 'Walk-in'}</p>
                    <p className="text-xs text-muted-foreground">
                      {loadingAppointment
                        ? 'Loading…'
                        : `${cart.length} service${cart.length === 1 ? '' : 's'} from this booking`}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => switchMode('appointment')}>
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search today's bookings…"
                      className="pl-9"
                      value={apptSearch}
                      onChange={(e) => setApptSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-64 space-y-1.5 overflow-y-auto">
                    {todaysAppointments.isLoading &&
                      Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 rounded-lg" />
                      ))}
                    {!todaysAppointments.isLoading && filteredAppointments.length === 0 && (
                      <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                        No billable bookings today.
                      </p>
                    )}
                    {filteredAppointments.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => selectAppointment(a.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left hover:bg-accent"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{a.customer_name ?? 'Walk-in'}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatTime(a.start_time)} · {a.service_names.join(' + ')}
                          </p>
                        </div>
                        <StatusBadge status={a.status} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Item picker */}
          <Card>
            <CardContent className="p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-lg border p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={itemTab === 'service' ? 'default' : 'ghost'}
                    onClick={() => setItemTab('service')}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Services
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={itemTab === 'product' ? 'default' : 'ghost'}
                    onClick={() => setItemTab('product')}
                  >
                    <Package className="mr-1.5 h-3.5 w-3.5" /> Products
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={itemTab === 'package' ? 'default' : 'ghost'}
                    onClick={() => setItemTab('package')}
                  >
                    <Gift className="mr-1.5 h-3.5 w-3.5" /> Packages
                  </Button>
                </div>
                <div className="relative w-full max-w-[220px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search…"
                    className="pl-9"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {(itemTab === 'service'
                  ? services.isLoading
                  : itemTab === 'product'
                    ? products.isLoading
                    : packages.isLoading) &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}

                {itemTab === 'service' &&
                  shownServices.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => addToCart('service', s.id, s.name, Number(s.price_inr))}
                      className="flex items-center justify-between gap-2 rounded-lg border p-3 text-left hover:border-primary hover:bg-primary/5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.duration_minutes} min</p>
                      </div>
                      <span className="whitespace-nowrap font-semibold text-primary">
                        {formatInr(s.price_inr)}
                      </span>
                    </button>
                  ))}

                {itemTab === 'product' &&
                  shownProducts.map((p) => {
                    const low = p.stock <= p.reorder_level;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={p.stock < 1}
                        onClick={() =>
                          addToCart('product', p.id, p.name, Number(p.price_inr), p.stock)
                        }
                        className="flex items-center justify-between gap-2 rounded-lg border p-3 text-left hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{p.name}</p>
                          <Badge variant={low ? 'destructive' : 'secondary'} className="mt-1">
                            {p.stock < 1 ? 'Out of stock' : `${p.stock} in stock`}
                          </Badge>
                        </div>
                        <span className="whitespace-nowrap font-semibold text-primary">
                          {formatInr(p.price_inr)}
                        </span>
                      </button>
                    );
                  })}

                {itemTab === 'package' &&
                  shownPackages.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addToCart('package', p.id, p.name, Number(p.price_inr))}
                      className="flex items-center justify-between gap-2 rounded-lg border p-3 text-left hover:border-primary hover:bg-primary/5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.category}</p>
                      </div>
                      <span className="whitespace-nowrap font-semibold text-primary">
                        {formatInr(p.price_inr)}
                      </span>
                    </button>
                  ))}

                {!(itemTab === 'service'
                  ? services.isLoading
                  : itemTab === 'product'
                    ? products.isLoading
                    : packages.isLoading) &&
                  (itemTab === 'service'
                    ? shownServices.length
                    : itemTab === 'product'
                      ? shownProducts.length
                      : shownPackages.length) === 0 && (
                    <p className="col-span-full rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Nothing matches "{itemSearch}".
                    </p>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ticket / cart */}
        <Card className="lg:sticky lg:top-6">
          <CardContent className="space-y-4 p-4 md:p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <Receipt className="h-4 w-4" /> Ticket
              </h2>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                  Clear
                </Button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                <ShoppingBag className="h-6 w-6" />
                Tap a service or product to add it here.
              </div>
            ) : (
              <div className="max-h-[42vh] space-y-3 overflow-y-auto pr-1">
                {cart.map((l) => (
                  <div key={l.key} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{l.name}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeLine(l.key)}
                        title="Remove"
                        aria-label={`Remove ${l.name}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          title="Decrease quantity"
                          aria-label={`Decrease quantity of ${l.name}`}
                          onClick={() => setQty(l.key, l.quantity - 1)}
                          disabled={l.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm tabular-nums">{l.quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          title="Increase quantity"
                          aria-label={`Increase quantity of ${l.name}`}
                          onClick={() => setQty(l.key, l.quantity + 1)}
                          disabled={l.maxStock !== undefined && l.quantity >= l.maxStock}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatInr(round2(l.unitPrice * l.quantity - l.discountInr))}
                      </span>
                    </div>
                    {settings.allow_price_override ? (
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Price</span>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
                            ₹
                          </span>
                          <Input
                            type="number"
                            min={0}
                            aria-label={`Unit price for ${l.name}`}
                            value={l.unitPrice}
                            onChange={(e) => setUnitPrice(l.key, Number(e.target.value))}
                            className="h-6 w-20 pl-5 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </div>
                        <span>per unit</span>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatInr(l.unitPrice)} per unit
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Discount</span>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
                          ₹
                        </span>
                        <Input
                          type="number"
                          min={0}
                          aria-label={`Discount for ${l.name}`}
                          value={l.discountInr}
                          onChange={(e) => setLineDiscount(l.key, Number(e.target.value))}
                          className="h-6 w-20 pl-5 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <>
                <Separator />

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatInr(subtotal)}</span>
                  </div>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 px-2 py-1.5">
                      <span className="flex items-center gap-1.5 font-medium text-primary">
                        <Tag className="h-3.5 w-3.5" /> {appliedCoupon.code}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-primary">
                          −{formatInr(appliedCoupon.discountInr)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={removeCoupon}
                          title="Remove coupon"
                          aria-label={`Remove coupon ${appliedCoupon.code}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Input
                        placeholder="Coupon code"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                        className="h-7 flex-1 uppercase"
                      />
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={applyCoupon}
                        disabled={validateCoupon.isPending || !couponInput.trim()}
                      >
                        {validateCoupon.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          'Apply'
                        )}
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Bill discount</span>
                    <div className="flex items-center gap-1.5">
                      <div className="inline-flex overflow-hidden rounded-md border">
                        <Button
                          type="button"
                          size="xs"
                          variant={discountMode === 'flat' ? 'default' : 'ghost'}
                          className="rounded-none"
                          onClick={() => setDiscountMode('flat')}
                        >
                          ₹
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant={discountMode === 'percent' ? 'default' : 'ghost'}
                          className="rounded-none"
                          onClick={() => setDiscountMode('percent')}
                        >
                          %
                        </Button>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                        className="h-7 w-16 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Total discount</span>
                      <span className="tabular-nums">−{formatInr(totalDiscount)}</span>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="tabular-nums text-primary">{formatInr(total)}</span>
                  </div>
                </div>
              </>
            )}

            <Button className="w-full" size="lg" onClick={openPayment} disabled={cart.length === 0}>
              Charge {formatInr(total)}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Mobile/tablet: the ticket card above can be a long scroll away
          once services/products are being picked — this keeps the total
          and Charge button reachable at all times without scrolling. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur supports-backdrop-filter:bg-background/80 lg:hidden">
        <div className="mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">
              {cart.length} item{cart.length === 1 ? '' : 's'}
            </p>
            <p className="font-semibold text-primary">{formatInr(total)}</p>
          </div>
          <Button onClick={openPayment} disabled={cart.length === 0}>
            Charge {formatInr(total)}
          </Button>
        </div>
      </div>

      {/* Payment dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Take payment</DialogTitle>
            <DialogDescription>
              {formatInr(total)} due{customerName ? ` from ${customerName}` : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {payments.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select
                  value={p.method}
                  onValueChange={(v) => updatePayment(i, { method: v as PaymentMethod })}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['cash', 'card', 'upi'] as PaymentMethod[]).map((m) => (
                      <SelectItem key={m} value={m}>
                        {PAYMENT_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  value={p.amountInr}
                  onChange={(e) => updatePayment(i, { amountInr: Number(e.target.value) })}
                  className="flex-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                {payments.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title="Remove payment"
                    aria-label={`Remove payment ${i + 1}`}
                    onClick={() => removePayment(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}

            {payments.length < 3 && (
              <Button type="button" variant="outline" size="sm" onClick={addSplit}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Split payment
              </Button>
            )}

            <div
              className={cn(
                'flex items-center justify-between rounded-md border px-3 py-2 text-sm',
                isSettled
                  ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700'
                  : 'border-amber-500/40 bg-amber-500/5 text-amber-700'
              )}
            >
              <span>{isSettled ? 'Fully allocated' : remaining > 0 ? 'Remaining' : 'Over by'}</span>
              <span className="font-semibold tabular-nums">{formatInr(Math.abs(remaining))}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qb-notes">Notes (optional)</Label>
              <Textarea
                id="qb-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything worth remembering"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSale} disabled={createSale.isPending || !isSettled}>
              {createSale.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm {formatInr(total)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt */}
      <Dialog
        open={!!receipt}
        onOpenChange={(o) => {
          if (!o) {
            setReceipt(null);
            setPrintFormat(null);
          }
        }}
      >
        <DialogContent className="max-w-md print:static print:top-0 print:left-0 print:w-auto print:max-w-none print:translate-x-0 print:translate-y-0 print:rounded-none print:bg-white print:p-0 print:shadow-none print:ring-0">
          {receipt && (
            <>
              <DialogHeader className="print:hidden">
                <DialogTitle className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" /> Sale complete
                </DialogTitle>
                <DialogDescription>
                  {new Date(receipt.created_at).toLocaleString('en-IN')} · #{receipt.id.slice(0, 8)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm print:hidden">
                <div>
                  <p className="font-medium">{receipt.customer_name || 'Walk-in guest'}</p>
                  {receipt.customer_phone && (
                    <p className="text-xs text-muted-foreground">{receipt.customer_phone}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Billed by {receipt.staff_name}</p>
                </div>
                <Separator />
                <div className="space-y-1.5">
                  {receipt.items.map((it) => (
                    <div key={it.id} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">
                        {it.name} × {it.quantity}
                      </span>
                      <span className="tabular-nums">{formatInr(it.lineTotal)}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatInr(receipt.subtotal_inr)}</span>
                  </div>
                  {Number(receipt.discount_inr) - Number(receipt.coupon_discount_inr) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Discount</span>
                      <span className="tabular-nums">
                        −
                        {formatInr(
                          Number(receipt.discount_inr) - Number(receipt.coupon_discount_inr)
                        )}
                      </span>
                    </div>
                  )}
                  {receipt.coupon_code && (
                    <div className="flex justify-between text-primary">
                      <span>Coupon {receipt.coupon_code}</span>
                      <span className="tabular-nums">
                        −{formatInr(receipt.coupon_discount_inr)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span className="tabular-nums">{formatInr(receipt.total_inr)}</span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  {receipt.payments.map((p, i) => (
                    <div key={i} className="flex justify-between text-muted-foreground">
                      <span>{PAYMENT_LABELS[p.method]}</span>
                      <span className="tabular-nums">{formatInr(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* POS slip — narrow continuous-strip layout, print-only */}
              {printFormat === 'pos' && (
                <div className="hidden w-[76mm] bg-white p-2 text-black print:block">
                  <div className="text-center">
                    <p className="text-sm font-bold">{settings.name}</p>
                    <p className="text-[10px]">{settings.address}</p>
                    <p className="text-[10px]">
                      {settings.phone} · {settings.email}
                    </p>
                    {settings.gstin && <p className="text-[10px]">GSTIN {settings.gstin}</p>}
                  </div>
                  <div className="my-2 border-t border-dashed border-black" />
                  <p className="text-[10px]">Receipt #{receipt.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-[10px]">
                    {new Date(receipt.created_at).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px]">Served by {receipt.staff_name}</p>
                  <p className="text-[10px]">{receipt.customer_name || 'Walk-in guest'}</p>
                  <div className="my-2 border-t border-dashed border-black" />
                  <div className="space-y-1">
                    {receipt.items.map((it) => (
                      <div key={it.id} className="text-[11px]">
                        <div className="flex justify-between">
                          <span>{it.name}</span>
                          <span>{formatInr(it.lineTotal)}</span>
                        </div>
                        <div className="text-[9px] text-neutral-600">
                          {it.quantity} × {formatInr(it.unitPrice)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="my-2 border-t border-dashed border-black" />
                  <div className="space-y-0.5 text-[11px]">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatInr(receipt.subtotal_inr)}</span>
                    </div>
                    {Number(receipt.discount_inr) - Number(receipt.coupon_discount_inr) > 0 && (
                      <div className="flex justify-between">
                        <span>Discount</span>
                        <span>
                          −
                          {formatInr(
                            Number(receipt.discount_inr) - Number(receipt.coupon_discount_inr)
                          )}
                        </span>
                      </div>
                    )}
                    {receipt.coupon_code && (
                      <div className="flex justify-between">
                        <span>Coupon {receipt.coupon_code}</span>
                        <span>−{formatInr(receipt.coupon_discount_inr)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold">
                      <span>Total</span>
                      <span>{formatInr(receipt.total_inr)}</span>
                    </div>
                  </div>
                  <div className="my-2 border-t border-dashed border-black" />
                  <div className="space-y-0.5 text-[11px]">
                    {receipt.payments.map((p, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{PAYMENT_LABELS[p.method]}</span>
                        <span>{formatInr(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="my-2 border-t border-dashed border-black" />
                  <p className="text-center text-[10px]">Thank you for visiting {settings.name}!</p>
                </div>
              )}

              {/* A4 invoice — full-page layout, print-only */}
              {printFormat === 'a4' && (
                <div className="hidden bg-white p-8 text-black print:block">
                  <div className="flex items-start justify-between border-b-2 border-black pb-4">
                    <div>
                      <p className="text-2xl font-bold">{settings.name}</p>
                      <p className="text-sm">{settings.address}</p>
                      <p className="text-sm">
                        {settings.phone} · {settings.email}
                      </p>
                      {settings.gstin && <p className="text-sm">GSTIN: {settings.gstin}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold uppercase">Invoice</p>
                      <p className="text-sm">#{receipt.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-sm">
                        {new Date(receipt.created_at).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-between text-sm">
                    <div>
                      <p className="text-xs uppercase text-neutral-500">Billed to</p>
                      <p className="font-medium">{receipt.customer_name || 'Walk-in guest'}</p>
                      {receipt.customer_phone && <p>{receipt.customer_phone}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase text-neutral-500">Served by</p>
                      <p className="font-medium">{receipt.staff_name}</p>
                    </div>
                  </div>

                  <table className="mt-6 w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b-2 border-black text-left">
                        <th className="py-2 font-semibold">Item</th>
                        <th className="py-2 text-right font-semibold">Qty</th>
                        <th className="py-2 text-right font-semibold">Unit price</th>
                        <th className="py-2 text-right font-semibold">Discount</th>
                        <th className="py-2 text-right font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipt.items.map((it) => (
                        <tr key={it.id} className="border-b border-neutral-300">
                          <td className="py-2">{it.name}</td>
                          <td className="py-2 text-right">{it.quantity}</td>
                          <td className="py-2 text-right">{formatInr(it.unitPrice)}</td>
                          <td className="py-2 text-right">
                            {Number(it.discount) > 0 ? `−${formatInr(it.discount)}` : '—'}
                          </td>
                          <td className="py-2 text-right">{formatInr(it.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-4 flex justify-end">
                    <div className="w-64 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatInr(receipt.subtotal_inr)}</span>
                      </div>
                      {Number(receipt.discount_inr) - Number(receipt.coupon_discount_inr) > 0 && (
                        <div className="flex justify-between">
                          <span>Discount</span>
                          <span>
                            −
                            {formatInr(
                              Number(receipt.discount_inr) - Number(receipt.coupon_discount_inr)
                            )}
                          </span>
                        </div>
                      )}
                      {receipt.coupon_code && (
                        <div className="flex justify-between">
                          <span>Coupon {receipt.coupon_code}</span>
                          <span>−{formatInr(receipt.coupon_discount_inr)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t-2 border-black pt-1 text-base font-bold">
                        <span>Total</span>
                        <span>{formatInr(receipt.total_inr)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs uppercase text-neutral-500">Payment</p>
                    {receipt.payments.map((p, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{PAYMENT_LABELS[p.method]}</span>
                        <span>{formatInr(p.amount)}</span>
                      </div>
                    ))}
                  </div>

                  <p className="mt-10 text-center text-xs text-neutral-500">
                    Thank you for choosing {settings.name}. We look forward to seeing you again.
                  </p>
                </div>
              )}

              <DialogFooter className="flex-wrap print:hidden">
                <Button variant="outline" onClick={() => printReceipt('pos')}>
                  <Printer className="mr-2 h-4 w-4" /> Print · POS
                </Button>
                <Button variant="outline" onClick={() => printReceipt('a4')}>
                  <FileText className="mr-2 h-4 w-4" /> Print · A4
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `${window.location.origin}${ROUTES.invoice(receipt.id)}`
                      );
                      toast.success('Invoice link copied');
                    } catch {
                      toast.error("Couldn't copy the link");
                    }
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy link
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const invoiceUrl = `${window.location.origin}${ROUTES.invoice(receipt.id)}`;
                    const message = `Here's your invoice from ${settings.name} — ${formatInr(receipt.total_inr)}\n${invoiceUrl}`;
                    const phone = receipt.customer_phone
                      ? `91${receipt.customer_phone.replace(/\D/g, '')}`
                      : '';
                    window.open(
                      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
                      '_blank'
                    );
                  }}
                >
                  <Share2 className="mr-2 h-4 w-4" /> WhatsApp
                </Button>
                <Button onClick={() => setReceipt(null)}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default QuickBillingPage;
