import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { apiError } from '@/lib/apiError';
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gift,
  PartyPopper,
  ScissorsSquare,
  Search,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PageHeader from '@/components/common/PageHeader';
import SectionError from '@/components/common/SectionError';
import { cn } from '@/lib/utils';
import { imageUrl } from '@/lib/imageUrl';
import { formatInr } from '@/lib/formatCurrency';
import { digitsOnly, lettersOnly, nameInputProps, phoneInputProps } from '@/lib/inputHelpers';
import { TIME_SLOTS } from '@/lib/mockData';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useCategories, useServices } from '@/services/services.api';
import { usePackage } from '@/services/packages.api';
import { useStaff } from '@/services/staff.api';
import { useCustomers } from '@/services/users.api';
import { useHolidays } from '@/services/holidays.api';
import {
  useCreateAppointment,
  useCreateGuestAppointment,
  useSlotAvailability,
} from '@/services/appointments.api';

const STEPS = [
  { id: 1, label: 'Services' },
  { id: 2, label: 'Stylist' },
  { id: 3, label: 'Date & Time' },
  { id: 4, label: 'Confirm' },
];

function generateDates(days = 14) {
  const arr: { iso: string; day: string; date: string; weekday: string }[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    arr.push({
      iso: d.toISOString().slice(0, 10),
      day: String(d.getDate()).padStart(2, '0'),
      date: d.toLocaleString('en-IN', { month: 'short' }),
      weekday: d.toLocaleString('en-IN', { weekday: 'short' }),
    });
  }
  return arr;
}

function BookAppointmentPage() {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();
  const isGuest = !isAuthenticated || role !== 'customer';
  // Staff/admin are logged in but still hit the identity-capture step —
  // they're booking on behalf of a customer, not for themselves — so the
  // copy differs from a true anonymous guest.
  const isStaffBooking = isAuthenticated && role !== 'customer';

  const [step, setStep] = useState(1);
  const [categoryKey, setCategoryKey] = useState<string>('all');
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Arrived via a package's "Book Now" link (?package=<id>) — pre-fill its
  // linked services once, and book at the package's own flat price instead
  // of the summed service prices. Applied during render (React's own
  // "adjusting state when a value changes" pattern) rather than an effect,
  // guarded by `appliedPackageId` so it only fires once per package —
  // removing the banner clears `packageId` without re-triggering it.
  const [searchParams] = useSearchParams();
  const packageIdParam = searchParams.get('package') ?? undefined;
  const packageQuery = usePackage(packageIdParam);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [appliedPackageId, setAppliedPackageId] = useState<string | null>(null);

  if (packageQuery.data && packageQuery.data.id !== appliedPackageId) {
    setAppliedPackageId(packageQuery.data.id);
    setPackageId(packageQuery.data.id);
    setSelectedServiceIds(packageQuery.data.services.map((s) => s.id));
  }

  // A dead/deleted `?package=` link previously failed completely silently —
  // no banner, no message, just landing on step 1 with nothing selected.
  // This is a genuine side effect (showing a toast), unlike the state
  // adjustment above, so it belongs in an effect, not during render.
  useEffect(() => {
    if (packageIdParam && packageQuery.isError) {
      toast.error("That package link doesn't work anymore — pick from the options below instead.");
    }
  }, [packageIdParam, packageQuery.isError]);

  const removePackage = () => {
    setPackageId(null);
    setSelectedServiceIds([]);
  };

  // Guest identity — only used/shown when isGuest
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // Staff booking for a customer: look up whether this phone already
  // belongs to someone, so staff see who they're about to attach the
  // booking to instead of finding out only after submit.
  const customers = useCustomers({ enabled: isStaffBooking });
  const matchedCustomer = useMemo(() => {
    if (!isStaffBooking || guestPhone.length !== 10) return null;
    return (
      customers.data?.find((c) => (c.phone ?? '').replace(/\D/g, '').slice(-10) === guestPhone) ??
      null
    );
  }, [isStaffBooking, guestPhone, customers.data]);
  const [guestConfirmed, setGuestConfirmed] = useState<{
    name: string;
    date: string;
    time: string;
    services: string[];
    total: number;
  } | null>(null);

  const dates = useMemo(() => generateDates(14), []);
  const categories = useCategories();
  const services = useServices();
  const staff = useStaff();
  const holidays = useHolidays();
  const holidayByDate = useMemo(() => {
    const map = new Map<string, string>();
    holidays.data?.forEach((h) => map.set(h.holiday_date, h.reason || 'Salon closed'));
    return map;
  }, [holidays.data]);

  const createMut = useCreateAppointment();
  const createGuestMut = useCreateGuestAppointment();

  const shown = useMemo(() => {
    if (!services.data) return [];
    const q = serviceSearch.trim().toLowerCase();
    return services.data.filter((s) => {
      const matchesCategory = categoryKey === 'all' || s.category_key === categoryKey;
      const matchesSearch =
        !q || s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [services.data, categoryKey, serviceSearch]);

  const selectedServices = useMemo(
    () => services.data?.filter((s) => selectedServiceIds.includes(s.id)) ?? [],
    [services.data, selectedServiceIds]
  );
  const summedPrice = selectedServices.reduce((sum, s) => sum + Number(s.price_inr), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  // Booking through a package charges its own flat (discounted-bundle)
  // price — duration still comes from the real selected services above, so
  // staff scheduling stays accurate.
  const totalPrice =
    packageId && packageQuery.data ? Number(packageQuery.data.price_inr) : summedPrice;

  const availability = useSlotAvailability({
    date: date ?? undefined,
    durationMinutes: totalDuration || undefined,
    staffId: staffId && staffId !== 'any' ? staffId : undefined,
    serviceIds: selectedServiceIds,
  });

  const canProceed =
    (step === 1 && selectedServiceIds.length > 0) ||
    (step === 2 && !!staffId) ||
    (step === 3 && !!date && !!time) ||
    step === 4;

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = async () => {
    if (!date || !time) return;
    const isRealStaff =
      !!staffId &&
      staffId !== 'any' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(staffId);

    if (isGuest) {
      if (guestName.trim().length < 2) return toast.error('Enter your name');
      if (!/^\d{10}$/.test(guestPhone)) return toast.error('Enter a valid 10-digit phone');
      try {
        await createGuestMut.mutateAsync({
          name: guestName.trim(),
          phone: guestPhone,
          email: guestEmail.trim() || undefined,
          staffId: isRealStaff ? staffId : null,
          appointmentDate: date,
          startTime: time,
          serviceIds: selectedServiceIds,
          packageId: packageId ?? undefined,
          notes: notes || undefined,
        });
        setGuestConfirmed({
          name: guestName.trim(),
          date,
          time,
          services: selectedServices.map((s) => s.name),
          total: totalPrice,
        });
      } catch (err) {
        toast.error(apiError(err, 'Booking failed'));
      }
      return;
    }

    try {
      await createMut.mutateAsync({
        staffId: isRealStaff ? staffId : null,
        appointmentDate: date,
        startTime: time,
        serviceIds: selectedServiceIds,
        packageId: packageId ?? undefined,
        notes: notes || undefined,
      });
      toast.success('Appointment booked!');
      navigate(ROUTES.myAppointments);
    } catch (err) {
      toast.error(apiError(err, 'Booking failed'));
    }
  };

  const busySet = new Set(availability.data?.busy ?? []);

  if (guestConfirmed) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="border-2 border-primary">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <PartyPopper className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {isStaffBooking ? `Booked for ${guestConfirmed.name}` : 'Booking confirmed!'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isStaffBooking
                  ? "The slot is reserved and ready on the customer's record."
                  : "We've reserved your slot — we'll see you then."}
              </p>
            </div>
            <div className="w-full space-y-2 rounded-lg border bg-muted/30 p-4 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Services</span>
                <span className="font-medium">{guestConfirmed.services.join(' + ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date &amp; time</span>
                <span className="font-medium">
                  {guestConfirmed.date} at {guestConfirmed.time}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Total</span>
                <span className="text-primary">{formatInr(guestConfirmed.total)}</span>
              </div>
            </div>
            {isStaffBooking ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setGuestConfirmed(null);
                    setStep(1);
                    setSelectedServiceIds([]);
                    setStaffId(null);
                    setDate(null);
                    setTime(null);
                    setNotes('');
                    setGuestName('');
                    setGuestPhone('');
                    setGuestEmail('');
                  }}
                >
                  Book another
                </Button>
                <Button variant="outline" asChild>
                  <Link to={role === 'admin' ? ROUTES.adminAppointments : ROUTES.staffAppointments}>
                    View appointments
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Booked as a guest — create an account with the same email or phone to track this
                  booking online and book faster next time.
                </p>
                <div className="flex gap-2">
                  <Button asChild>
                    <Link to={ROUTES.register}>Create an account</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to={ROUTES.home}>Back to home</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'pb-24 lg:pb-0',
        // The admin/staff booking flow lives inside DashboardLayout, which
        // already has a sidebar bounding the width — capping it again here
        // (like the public guest page needs, since it has no such bound)
        // just wasted a huge strip of screen on wide monitors. Matches
        // QuickBillingPage's own unconstrained width for the same reason.
        !isStaffBooking && 'mx-auto max-w-6xl'
      )}
    >
      {isStaffBooking ? (
        <PageHeader
          title="Book an appointment for a customer"
          description="Books straight onto the schedule — no separate walk-in step needed."
        />
      ) : (
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Booking</p>
          <h1 className="mt-2 text-4xl font-bold md:text-5xl">Book an appointment</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Just a few taps and you&apos;re set.
          </p>
        </div>
      )}

      {packageId && packageQuery.data && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-primary bg-primary/5 p-3 text-sm">
          <span className="flex items-center gap-2">
            <Gift className="h-4 w-4 flex-shrink-0 text-primary" />
            Booking package: <strong>{packageQuery.data.name}</strong> — ₹
            {Number(packageQuery.data.price_inr).toLocaleString('en-IN')}
          </span>
          <Button variant="ghost" size="sm" onClick={removePackage}>
            <X className="mr-1 h-3.5 w-3.5" /> Remove
          </Button>
        </div>
      )}

      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                step >= s.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {step > s.id ? <Check className="h-4 w-4" /> : s.id}
            </div>
            <span
              className={cn(
                'text-[11px] font-medium sm:text-sm',
                step >= s.id ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 rounded-full',
                  step > s.id ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <Card>
          <CardContent className="p-6 md:p-8">
            {step === 1 && (
              <div>
                <h2 className="text-lg font-semibold">Choose your services</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select one or more services to book together.
                </p>

                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search services…"
                    className="pl-9"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={categoryKey === 'all' ? 'default' : 'outline'}
                    onClick={() => setCategoryKey('all')}
                  >
                    All
                  </Button>
                  {categories.data?.map((c) => (
                    <Button
                      key={c.key}
                      size="sm"
                      variant={categoryKey === c.key ? 'default' : 'outline'}
                      onClick={() => setCategoryKey(c.key)}
                    >
                      {c.label}
                    </Button>
                  ))}
                </div>
                <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {services.isLoading &&
                    Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                  {services.isError && (
                    <SectionError
                      className="col-span-full"
                      message="Couldn't load services right now."
                      onRetry={() => services.refetch()}
                    />
                  )}
                  {!services.isLoading && !services.isError && shown.length === 0 && (
                    <p className="col-span-full rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                      No services match{serviceSearch ? ` "${serviceSearch}"` : ' this filter'}.
                    </p>
                  )}
                  {shown.map((s) => {
                    const active = selectedServiceIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="checkbox"
                        aria-checked={active}
                        onClick={() => toggleService(s.id)}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                          active ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                        )}
                      >
                        <div
                          className={cn(
                            'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border',
                            active
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-input'
                          )}
                        >
                          {active && <Check className="h-3 w-3" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium">{s.name}</p>
                            <p className="whitespace-nowrap font-semibold text-primary">
                              ₹{Number(s.price_inr).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                            {s.description}
                          </p>
                          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> {s.duration_minutes} min
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-lg font-semibold">Pick a stylist</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose your preferred stylist or leave it to us.
                </p>
                <button
                  type="button"
                  aria-pressed={staffId === 'any'}
                  onClick={() => setStaffId('any')}
                  className={cn(
                    'mt-4 flex w-full items-center gap-3 rounded-lg border p-4 text-left',
                    staffId === 'any' ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                  )}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Any available stylist</p>
                    <p className="text-sm text-muted-foreground">
                      We&apos;ll assign the best available expert.
                    </p>
                  </div>
                </button>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {staff.data?.map((st) => {
                    const active = staffId === st.user_id;
                    return (
                      <button
                        key={st.user_id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setStaffId(st.user_id)}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border p-4 text-left',
                          active ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                        )}
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={imageUrl(st.avatar_url)} alt={st.name} />
                          <AvatarFallback>{st.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{st.name}</p>
                          <p className="text-xs text-muted-foreground">{st.role_title}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {st.specialties.map((sp) => (
                              <Badge key={sp} variant="secondary">
                                {sp}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-lg font-semibold">Pick a date & time</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your booking will take{' '}
                  <span className="font-semibold text-foreground">{totalDuration} min</span> total.
                  Slots that would overlap an existing booking are disabled.
                </p>

                <div className="mt-4">
                  <Label className="text-xs uppercase text-muted-foreground">Date</Label>
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                    {dates.map((d) => {
                      const active = date === d.iso;
                      const holidayReason = holidayByDate.get(d.iso);
                      return (
                        <button
                          key={d.iso}
                          type="button"
                          aria-pressed={active}
                          disabled={!!holidayReason}
                          title={holidayReason}
                          onClick={() => {
                            setDate(d.iso);
                            setTime(null);
                          }}
                          className={cn(
                            'flex min-w-[68px] flex-col items-center rounded-lg border p-3 text-sm',
                            holidayReason
                              ? 'cursor-not-allowed opacity-40'
                              : active
                                ? 'border-primary bg-primary/5'
                                : 'hover:bg-accent'
                          )}
                        >
                          <span className="text-xs text-muted-foreground">{d.weekday}</span>
                          <span className="text-lg font-bold">{d.day}</span>
                          <span className="text-xs text-muted-foreground">{d.date}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6">
                  <Label className="text-xs uppercase text-muted-foreground">
                    Time {availability.isFetching ? '(checking…)' : ''}
                  </Label>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {TIME_SLOTS.map((t) => {
                      const active = time === t;
                      const busy = busySet.has(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={active}
                          disabled={busy}
                          onClick={() => setTime(t)}
                          className={cn(
                            'rounded-md border px-3 py-2 text-sm',
                            busy &&
                              'cursor-not-allowed bg-muted text-muted-foreground line-through opacity-60',
                            !busy && active && 'border-primary bg-primary text-primary-foreground',
                            !busy && !active && 'hover:bg-accent'
                          )}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {staffId === 'any'
                      ? 'Greyed slots are unavailable across all stylists.'
                      : 'Greyed slots are already booked for this stylist.'}
                  </p>
                </div>

                <div className="mt-6">
                  <Label htmlFor="notes">Special requests (optional)</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    placeholder="Anything we should know?"
                    className="mt-2"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="text-lg font-semibold">Review & confirm</h2>

                <div className="mt-6 space-y-4">
                  {isGuest && (
                    <div className="rounded-lg border p-4">
                      <p className="text-xs uppercase text-muted-foreground">
                        {isStaffBooking ? "Customer's details" : 'Your details'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {isStaffBooking
                          ? "Who this appointment is for — an existing phone number attaches it to that customer's record."
                          : 'No account needed — just enough to hold your slot.'}
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="guest-name">Full name</Label>
                          <Input
                            id="guest-name"
                            value={guestName}
                            {...nameInputProps}
                            onChange={(e) => setGuestName(lettersOnly(e.target.value))}
                            placeholder="Priya Sharma"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="guest-phone">Phone</Label>
                          <Input
                            id="guest-phone"
                            value={guestPhone}
                            {...phoneInputProps}
                            onChange={(e) => setGuestPhone(digitsOnly(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        <Label htmlFor="guest-email">Email (optional)</Label>
                        <Input
                          id="guest-email"
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="For a copy of your booking details"
                        />
                      </div>

                      {isStaffBooking && guestPhone.length === 10 && (
                        <div
                          className={cn(
                            'mt-3 flex items-center justify-between gap-3 rounded-md border p-3 text-xs',
                            matchedCustomer
                              ? 'border-emerald-500/40 bg-emerald-500/5'
                              : 'border-amber-500/40 bg-amber-500/5'
                          )}
                        >
                          {customers.isLoading ? (
                            <span className="text-muted-foreground">
                              Checking existing customers…
                            </span>
                          ) : matchedCustomer ? (
                            <>
                              <span>
                                Matches existing customer{' '}
                                <span className="font-semibold">{matchedCustomer.name}</span> — this
                                booking will attach to their record.
                              </span>
                              {matchedCustomer.name !== guestName && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="shrink-0"
                                  onClick={() => setGuestName(matchedCustomer.name)}
                                >
                                  Use this name
                                </Button>
                              )}
                            </>
                          ) : (
                            <span>
                              No existing customer with this number — a new customer record will be
                              created.
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase text-muted-foreground">Services</p>
                    <ul className="mt-2 space-y-2">
                      {selectedServices.map((s) => (
                        <li key={s.id} className="flex items-center justify-between text-sm">
                          <span>{s.name}</span>
                          <span className="font-medium">
                            {packageId ? (
                              <span className="text-xs text-muted-foreground">In package</span>
                            ) : (
                              `₹${Number(s.price_inr).toLocaleString('en-IN')}`
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
                      <span className="text-muted-foreground">Total duration</span>
                      <span className="font-medium">{totalDuration} min</span>
                    </div>
                    {packageId && packageQuery.data && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Priced as part of the {packageQuery.data.name} package — see total below.
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase text-muted-foreground">Stylist</p>
                    <div className="mt-2 flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">
                        {staffId === 'any'
                          ? 'Any available stylist'
                          : staff.data?.find((s) => s.user_id === staffId)?.name}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase text-muted-foreground">Date & time</p>
                    <div className="mt-2 flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">
                        {date} at {time}
                      </p>
                    </div>
                  </div>

                  {notes && (
                    <div className="rounded-lg border p-4">
                      <p className="text-xs uppercase text-muted-foreground">Notes</p>
                      <p className="mt-1 text-sm">{notes}</p>
                    </div>
                  )}

                  <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">₹{totalPrice.toLocaleString('en-IN')}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pay at the salon. Free cancellation up to 3 hrs before.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Desktop: running summary + actions, pinned in view so Next/Confirm
          is always reachable without scrolling past the step content. */}
        <Card className="hidden lg:sticky lg:top-6 lg:block">
          <CardContent className="space-y-4 p-5">
            <h2 className="font-semibold">Your booking</h2>

            {selectedServices.length === 0 ? (
              <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                No services selected yet.
              </p>
            ) : (
              <div className="max-h-[32vh] space-y-2 overflow-y-auto pr-1">
                {selectedServices.map((s) => (
                  <div key={s.id} className="flex items-start justify-between gap-2 text-sm">
                    <span className="flex-1">{s.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="whitespace-nowrap font-medium tabular-nums">
                        {packageId ? 'In package' : formatInr(s.price_inr)}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleService(s.id)}
                        title="Remove"
                        aria-label={`Remove ${s.name}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedServices.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Duration</span>
                    <span className="font-medium text-foreground">{totalDuration} min</span>
                  </div>
                  {staffId && (
                    <div className="flex items-center gap-1.5">
                      <ScissorsSquare className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {staffId === 'any'
                          ? 'Any available stylist'
                          : staff.data?.find((st) => st.user_id === staffId)?.name}
                      </span>
                    </div>
                  )}
                  {date && time && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {date} at {time}
                      </span>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="flex items-center justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatInr(totalPrice)}</span>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                disabled={step === 1}
                onClick={() => setStep((s) => s - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              {step < STEPS.length ? (
                <Button
                  className="flex-1"
                  disabled={!canProceed}
                  onClick={() => setStep((s) => s + 1)}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  onClick={handleConfirm}
                  disabled={createMut.isPending || createGuestMut.isPending}
                >
                  {createMut.isPending || createGuestMut.isPending ? 'Booking…' : 'Confirm'}
                  <Check className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile: the same summary total + action buttons, pinned to the
          bottom of the viewport instead of the page — the step content
          above can be as long as it needs to be (search results, staff
          lists, etc.) without ever burying the Next/Confirm button. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur supports-backdrop-filter:bg-background/80 lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">
              {selectedServices.length} service{selectedServices.length === 1 ? '' : 's'}
              {date && time ? ` · ${date} ${time}` : ''}
            </p>
            <p className="font-semibold text-primary">{formatInr(totalPrice)}</p>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={step === 1}
              onClick={() => setStep((s) => s - 1)}
              aria-label="Back"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {step < STEPS.length ? (
              <Button disabled={!canProceed} onClick={() => setStep((s) => s + 1)}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleConfirm}
                disabled={createMut.isPending || createGuestMut.isPending}
              >
                {createMut.isPending || createGuestMut.isPending ? 'Booking…' : 'Confirm'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookAppointmentPage;
