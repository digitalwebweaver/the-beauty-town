import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FallbackImage from '@/components/common/FallbackImage';
import SectionError from '@/components/common/SectionError';
import Pagination from '@/components/common/Pagination';
import ServiceCategorySection from '@/components/common/ServiceCategorySection';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { ROUTES } from '@/constants/routes';
import { imageUrl } from '@/lib/imageUrl';
import { useAuth } from '@/hooks/useAuth';
import { groupIntoSections } from '@/lib/serviceSections';
import { useCategories, useServices, type ServiceDto } from '@/services/services.api';

const PAGE_SIZE = 12;
// A stable empty-array reference so `filtered` doesn't change identity on
// every render while services.data is still loading (a fresh `?? []`
// literal would, which trips up the useMemo below it).
const EMPTY_SERVICES: ServiceDto[] = [];

const HERO_COPY: Record<string, { eyebrow: string; heading: string; body: string }> = {
  male: {
    eyebrow: 'Service for male',
    heading: 'Unisex Salon in Vadodara',
    body: "We are Vadodara's go-to destination for men's grooming and styling. As the most trusted unisex salon in Vadodara, we offer everything from classic haircuts to modern beard grooming, plus dedicated groom packages and wedding styling.",
  },
  female: {
    eyebrow: 'Service for female',
    heading: 'Beauty Salon in Vadodara',
    body: 'Our female services are designed for every occasion — from a quick blow-dry to a full bridal transformation. Explore our exclusive bridal makeup packages or book a consultation with our skilled team.',
  },
  all: {
    eyebrow: 'Our services',
    heading: 'Every service you love',
    body: 'From everyday grooming to bridal makeovers — explore our complete menu.',
  },
};

function ServicesPage() {
  const [searchParams] = useSearchParams();
  const genderParam =
    searchParams.get('gender') === 'male' || searchParams.get('gender') === 'female'
      ? searchParams.get('gender')!
      : 'all';

  const [tab, setTab] = useState<string>('all');
  const [genderTab, setGenderTab] = useState<string>(genderParam);
  // Following a fresh "Services for Male/Female" link while already on
  // this page (URL changes, component doesn't remount) should still
  // switch the tab — adjust state during render, guarded so it only
  // fires once per actual URL change rather than fighting the tab clicks.
  const [appliedGenderParam, setAppliedGenderParam] = useState(genderParam);
  if (genderParam !== appliedGenderParam) {
    setAppliedGenderParam(genderParam);
    setGenderTab(genderParam);
    setTab('all');
  }

  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q);
  const [page, setPage] = useState(1);
  const { isAuthenticated, role } = useAuth();
  const bookHref = isAuthenticated && role === 'customer' ? ROUTES.book : ROUTES.guestBook;

  // A specific gender renders the real site's own long, sectioned page
  // (Female Hair, Hair Texture, Hair Spa, …) instead of a flat searchable
  // grid — "All" keeps the grid as a practical browse-everything fallback,
  // since the real site itself has no combined view.
  const isGenderView = genderTab === 'female' || genderTab === 'male';

  const categories = useCategories();
  // Category, gender, and search are all applied server-side (the search
  // box used to do a plain client-side substring match on just the
  // already-fetched list — too brittle for a few hundred services, and it
  // missed the fact a category label like "Nails" was never checked).
  const services = useServices({
    categoryKey: isGenderView || tab === 'all' ? undefined : tab,
    gender: genderTab === 'all' ? undefined : genderTab,
    q: debouncedQ || undefined,
  });

  // Filters are server-side now, so this list is exactly what should be
  // shown — only pagination windows it further, client-side.
  const filtered = services.data ?? EMPTY_SERVICES;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE),
    [filtered, pageSafe]
  );
  const sections = useMemo(
    () => (isGenderView ? groupIntoSections(filtered, genderTab as 'male' | 'female') : []),
    [isGenderView, filtered, genderTab]
  );

  // Reset to page 1 whenever a filter/search actually changes the result
  // set — adjusted during render (not an effect) so it can't cause an extra
  // render round-trip, guarded by comparing against the previous filter key.
  const filterKey = `${tab}|${genderTab}|${debouncedQ}`;
  const [appliedFilterKey, setAppliedFilterKey] = useState(filterKey);
  if (filterKey !== appliedFilterKey) {
    setAppliedFilterKey(filterKey);
    if (page !== 1) setPage(1);
  }

  const hero = HERO_COPY[genderTab] ?? HERO_COPY.all;

  return (
    <div>
      <div className="border-b bg-brand-cream">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-maroon">
            {hero.eyebrow}
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold text-brand-maroon-dark md:text-5xl">
            {hero.heading}
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">{hero.body}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Tabs
            value={genderTab}
            onValueChange={(v) => {
              setGenderTab(v);
              // The selected category tab might not belong to the new gender
              // (e.g. "Male Hair" while switching to Female) — fall back to
              // "all" rather than silently keeping a now-irrelevant filter.
              if (v !== 'all' && !tab.startsWith(`${v}-`)) setTab('all');
            }}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="female">Female</TabsTrigger>
              <TabsTrigger value="male">Male</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search services…"
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {!isGenderView && (
          <div className="mb-6 overflow-x-auto">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="all">All categories</TabsTrigger>
                {categories.data
                  ?.filter((c) => genderTab === 'all' || c.key.startsWith(`${genderTab}-`))
                  .map((c) => (
                    <TabsTrigger key={c.key} value={c.key}>
                      {c.label}
                    </TabsTrigger>
                  ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        {services.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-lg" />
            ))}
          </div>
        ) : services.isError ? (
          <SectionError
            className="py-16"
            message="Couldn't load services right now."
            onRetry={() => services.refetch()}
          />
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-16 text-center">
              <p className="font-medium">No services match your search.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try clearing filters or searching a different term.
              </p>
            </CardContent>
          </Card>
        ) : isGenderView ? (
          <div className="divide-y">
            {sections.map((section, i) => (
              <ServiceCategorySection key={section.title} section={section} reverse={i % 2 === 1} />
            ))}
            <div className="flex justify-center pt-10">
              <Button
                asChild
                size="lg"
                className="bg-brand-maroon text-white hover:bg-brand-maroon/90"
              >
                <Link to={bookHref}>Book Now</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paged.map((s) => (
              <Card key={s.id} className="overflow-hidden pt-0">
                <FallbackImage
                  src={imageUrl(s.image_url)}
                  alt={s.name}
                  className="h-44 w-full object-cover"
                />
                <CardContent className="pt-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold">{s.name}</h3>
                    <p className="whitespace-nowrap text-sm font-bold text-primary">
                      ₹{Number(s.price_inr).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {s.duration_minutes} min
                    </span>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="capitalize">
                        {s.gender}
                      </Badge>
                      <Badge variant="secondary" className="capitalize">
                        {s.category_label}
                      </Badge>
                    </div>
                  </div>
                  <Button asChild className="mt-4 w-full">
                    <Link to={bookHref}>Book Now</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isGenderView && filtered.length > PAGE_SIZE && (
          <Pagination
            className="mt-8"
            page={pageSafe}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}

export default ServicesPage;
