import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Dices, Package, Palette, Plus, Printer, Search, Sparkles, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
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
import CouponTemplate from '@/components/common/CouponTemplate';
import { apiError } from '@/lib/apiError';
import { formatInr } from '@/lib/formatCurrency';
import { cn } from '@/lib/utils';
import { useServices } from '@/services/services.api';
import { useProducts } from '@/services/products.api';
import {
  useCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  type CouponDto,
  type CouponFormInput,
  type CouponItemInput,
} from '@/services/coupons.api';
import { ROUTES } from '@/constants/routes';

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

interface FormState {
  code: string;
  description: string;
  discountType: 'flat' | 'percent';
  discountValue: string;
  maxDiscountInr: string;
  minSpendInr: string;
  scope: 'bill' | 'items';
  items: CouponItemInput[];
  startsAt: string;
  expiresAt: string;
  maxRedemptions: string;
  perCustomerLimit: string;
  isActive: boolean;
}

const EMPTY: FormState = {
  code: '',
  description: '',
  discountType: 'flat',
  discountValue: '',
  maxDiscountInr: '',
  minSpendInr: '0',
  scope: 'bill',
  items: [],
  startsAt: '',
  expiresAt: '',
  maxRedemptions: '',
  perCustomerLimit: '1',
  isActive: true,
};

function toFormState(c: CouponDto): FormState {
  return {
    code: c.code,
    description: c.description ?? '',
    discountType: c.discount_type,
    discountValue: c.discount_value,
    maxDiscountInr: c.max_discount_inr ?? '',
    minSpendInr: c.min_spend_inr,
    scope: c.scope,
    items: (c.items ?? []).map((it) => ({
      type: it.item_type,
      id: (it.service_id ?? it.product_id) as string,
    })),
    startsAt: toDateInput(c.starts_at),
    expiresAt: toDateInput(c.expires_at),
    maxRedemptions: c.max_redemptions?.toString() ?? '',
    perCustomerLimit: c.per_customer_limit?.toString() ?? '',
    isActive: c.is_active,
  };
}

// -------- Create / edit dialog --------

function CouponFormDialog({
  editing,
  open,
  onOpenChange,
}: {
  editing: CouponDto | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const services = useServices();
  const products = useProducts();
  const createMut = useCreateCoupon();
  const updateMut = useUpdateCoupon();

  // Seed the form when the dialog opens for a different coupon (or a fresh
  // "new coupon" when editing is null) — adjusting state during render, not
  // in an effect, per the same pattern used in SettingsPage.tsx.
  const seedKey = open ? (editing?.id ?? 'new') : null;
  if (open && seedKey !== seededFor) {
    setSeededFor(seedKey);
    setForm(editing ? toFormState(editing) : { ...EMPTY, code: randomCode() });
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleItem = (item: CouponItemInput) =>
    setForm((prev) => {
      const exists = prev.items.some((i) => i.type === item.type && i.id === item.id);
      return {
        ...prev,
        items: exists
          ? prev.items.filter((i) => !(i.type === item.type && i.id === item.id))
          : [...prev.items, item],
      };
    });

  const shownServices = useMemo(
    () =>
      (services.data ?? []).filter((s) => s.name.toLowerCase().includes(itemSearch.toLowerCase())),
    [services.data, itemSearch]
  );
  const shownProducts = useMemo(
    () =>
      (products.data ?? []).filter((p) => p.name.toLowerCase().includes(itemSearch.toLowerCase())),
    [products.data, itemSearch]
  );

  const save = async () => {
    if (form.code.trim().length < 3) return toast.error('Code needs at least 3 characters');
    const discountValue = Number(form.discountValue);
    if (!discountValue || discountValue <= 0) return toast.error('Enter a discount value');
    if (form.discountType === 'percent' && discountValue > 100) {
      return toast.error("A percent coupon can't exceed 100%");
    }
    if (form.scope === 'items' && form.items.length === 0) {
      return toast.error('Pick at least one service or product');
    }

    const body: CouponFormInput = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || undefined,
      discountType: form.discountType,
      discountValue,
      maxDiscountInr:
        form.discountType === 'percent' && form.maxDiscountInr
          ? Number(form.maxDiscountInr)
          : undefined,
      minSpendInr: Number(form.minSpendInr) || 0,
      scope: form.scope,
      items: form.scope === 'items' ? form.items : [],
      startsAt: form.startsAt ? `${form.startsAt}T00:00:00.000Z` : undefined,
      expiresAt: form.expiresAt ? `${form.expiresAt}T23:59:59.999Z` : undefined,
      maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
      perCustomerLimit: form.perCustomerLimit ? Number(form.perCustomerLimit) : undefined,
      isActive: form.isActive,
    };

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, ...body });
        toast.success('Coupon updated');
      } else {
        await createMut.mutateAsync(body);
        toast.success('Coupon created');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(apiError(err, 'Could not save coupon'));
    }
  };

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit coupon' : 'New coupon'}</DialogTitle>
          <DialogDescription>
            Staff redeem this by typing the code into Quick Bill at checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-code">Code</Label>
              <div className="flex gap-2">
                <Input
                  id="c-code"
                  value={form.code}
                  onChange={(e) => set('code', e.target.value.toUpperCase())}
                  placeholder="WELCOME200"
                  className="uppercase"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => set('code', randomCode())}
                >
                  <Dices className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-desc">Description (shown on the printed coupon)</Label>
              <Input
                id="c-desc"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Festive special"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Discount</Label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex overflow-hidden rounded-md border">
                  <Button
                    type="button"
                    size="sm"
                    variant={form.discountType === 'flat' ? 'default' : 'ghost'}
                    className="rounded-none"
                    onClick={() => set('discountType', 'flat')}
                  >
                    ₹ Flat
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={form.discountType === 'percent' ? 'default' : 'ghost'}
                    className="rounded-none"
                    onClick={() => set('discountType', 'percent')}
                  >
                    % Percent
                  </Button>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={form.discountValue}
                  onChange={(e) => set('discountValue', e.target.value)}
                  placeholder={form.discountType === 'flat' ? '200' : '20'}
                  className="w-24"
                />
              </div>
              {form.discountType === 'percent' && (
                <Input
                  type="number"
                  min={0}
                  value={form.maxDiscountInr}
                  onChange={(e) => set('maxDiscountInr', e.target.value)}
                  placeholder="Max ₹ cap (optional)"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-min">Minimum spend</Label>
              <Input
                id="c-min"
                type="number"
                min={0}
                value={form.minSpendInr}
                onChange={(e) => set('minSpendInr', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Applies to</Label>
            <div className="inline-flex w-full overflow-hidden rounded-md border">
              <Button
                type="button"
                size="sm"
                variant={form.scope === 'bill' ? 'default' : 'ghost'}
                className="flex-1 rounded-none"
                onClick={() => set('scope', 'bill')}
              >
                Whole bill
              </Button>
              <Button
                type="button"
                size="sm"
                variant={form.scope === 'items' ? 'default' : 'ghost'}
                className="flex-1 rounded-none"
                onClick={() => set('scope', 'items')}
              >
                Specific services or products
              </Button>
            </div>
          </div>

          {form.scope === 'items' && (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search services or products…"
                  className="pl-9"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />
              </div>
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {shownServices.map((s) => {
                  const active = form.items.some((i) => i.type === 'service' && i.id === s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleItem({ type: 'service', id: s.id })}
                      className={cn(
                        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm',
                        active ? 'bg-primary/10' : 'hover:bg-accent'
                      )}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                      {s.name}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatInr(s.price_inr)}
                      </span>
                    </button>
                  );
                })}
                {shownProducts.map((p) => {
                  const active = form.items.some((i) => i.type === 'product' && i.id === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleItem({ type: 'product', id: p.id })}
                      className={cn(
                        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm',
                        active ? 'bg-primary/10' : 'hover:bg-accent'
                      )}
                    >
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      {p.name}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatInr(p.price_inr)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{form.items.length} selected</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-starts">Starts (optional)</Label>
              <Input
                id="c-starts"
                type="date"
                value={form.startsAt}
                onChange={(e) => set('startsAt', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-expires">Expires (optional)</Label>
              <Input
                id="c-expires"
                type="date"
                value={form.expiresAt}
                onChange={(e) => set('expiresAt', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-max">Total redemption cap</Label>
              <Input
                id="c-max"
                type="number"
                min={1}
                value={form.maxRedemptions}
                onChange={(e) => set('maxRedemptions', e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-percust">Per-customer limit</Label>
              <Input
                id="c-percust"
                type="number"
                min={1}
                value={form.perCustomerLimit}
                onChange={(e) => set('perCustomerLimit', e.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">
                Turn off to pause the code without deleting it.
              </p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending}>
            Save coupon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------- Main page --------

function CouponsPage() {
  const { data, isLoading } = useCoupons();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CouponDto | null>(null);
  const [printing, setPrinting] = useState<CouponDto | null>(null);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (c: CouponDto) => {
    setEditing(c);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Coupons"
        description="Create promo codes, print handout coupons, and track redemptions."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={ROUTES.adminCouponDesign}>
                <Palette className="mr-2 h-4 w-4" /> Design template
              </Link>
            </Button>
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" /> New coupon
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : !data?.length ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              <Tag className="h-6 w-6" />
              No coupons yet — create your first one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Applies to</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Redeemed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-mono font-semibold">{c.code}</p>
                      {c.description && (
                        <p className="text-xs text-muted-foreground">{c.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.discount_type === 'flat'
                        ? formatInr(c.discount_value)
                        : `${Number(c.discount_value)}%${c.max_discount_inr ? ` (up to ${formatInr(c.max_discount_inr)})` : ''}`}
                    </TableCell>
                    <TableCell>
                      {c.scope === 'bill' ? 'Whole bill' : `${c.item_count ?? 0} item(s)`}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.expires_at ? `Until ${toDateInput(c.expires_at)}` : 'No expiry'}
                    </TableCell>
                    <TableCell>
                      {c.redemptions_count}
                      {c.max_redemptions ? ` / ${c.max_redemptions}` : ''}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.is_active ? 'secondary' : 'outline'}>
                        {c.is_active ? 'Active' : 'Paused'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          title="Print"
                          aria-label={`Print coupon ${c.code}`}
                          onClick={() => setPrinting(c)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CouponFormDialog editing={editing} open={formOpen} onOpenChange={setFormOpen} />
      <CouponTemplate coupon={printing} onClose={() => setPrinting(null)} />
    </div>
  );
}

export default CouponsPage;
