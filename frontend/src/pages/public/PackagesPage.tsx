import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import FallbackImage from '@/components/common/FallbackImage';
import SectionError from '@/components/common/SectionError';
import { ROUTES } from '@/constants/routes';
import { imageUrl } from '@/lib/imageUrl';
import { useAuth } from '@/hooks/useAuth';
import { usePackages, type PackageDto } from '@/services/packages.api';

function PackageCard({ pkg, bookHref }: { pkg: PackageDto; bookHref: string }) {
  const price = Number(pkg.price_inr);
  const worth = pkg.worth_inr ? Number(pkg.worth_inr) : null;

  return (
    <Card className="flex flex-col overflow-hidden pt-0">
      <FallbackImage
        src={imageUrl(pkg.image_url)}
        alt={pkg.name}
        className="h-44 w-full object-cover"
      />
      <CardContent className="flex flex-1 flex-col pt-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold">{pkg.name}</h3>
          {pkg.validity_label && (
            <Badge variant="outline" className="whitespace-nowrap">
              {pkg.validity_label}
            </Badge>
          )}
        </div>

        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-lg font-bold text-primary">₹{price.toLocaleString('en-IN')}</p>
          {worth && worth > price && (
            <>
              <p className="text-sm text-muted-foreground line-through">
                ₹{worth.toLocaleString('en-IN')}
              </p>
              <p className="text-xs font-medium text-emerald-600">
                Save ₹{(worth - price).toLocaleString('en-IN')}
              </p>
            </>
          )}
        </div>

        {pkg.description && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{pkg.description}</p>
        )}

        {pkg.inclusions.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm">
            {pkg.inclusions.map((line, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-4">
          {pkg.is_bookable ? (
            <Button asChild className="w-full">
              <Link to={`${bookHref}?package=${pkg.id}`}>Book Now</Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="w-full">
              <Link to={`${ROUTES.contact}?package=${encodeURIComponent(pkg.name)}`}>
                Enquire Now
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PackagesPage() {
  const { isAuthenticated, role } = useAuth();
  const bookHref = isAuthenticated && role === 'customer' ? ROUTES.book : ROUTES.guestBook;
  const packages = usePackages();

  const grouped = useMemo(() => {
    const map = new Map<string, PackageDto[]>();
    for (const p of packages.data ?? []) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return Array.from(map.entries());
  }, [packages.data]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <div className="mb-10">
        <p className="text-sm font-medium text-primary">Packages</p>
        <h1 className="mt-2 text-4xl font-bold md:text-5xl">Memberships &amp; bundles</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Curated packages for brides, grooms, and regulars — better value than booking each service
          on its own.
        </p>
      </div>

      {packages.isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-lg" />
          ))}
        </div>
      ) : packages.isError ? (
        <SectionError
          className="py-16"
          message="Couldn't load packages right now."
          onRetry={() => packages.refetch()}
        />
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent className="p-16 text-center">
            <p className="font-medium">No packages available right now.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check back soon, or explore our services instead.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-12">
          {grouped.map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-5 text-xl font-semibold">{category}</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <PackageCard key={p.id} pkg={p} bookHref={bookHref} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default PackagesPage;
