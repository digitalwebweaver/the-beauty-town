import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import SectionError from '@/components/common/SectionError';
import PackageTierCard from '@/components/common/PackageTierCard';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { usePackages } from '@/services/packages.api';

function GroomPackagesPage() {
  const { isAuthenticated, role } = useAuth();
  const bookHref = isAuthenticated && role === 'customer' ? ROUTES.book : ROUTES.guestBook;
  const packages = usePackages({ category: 'Groom Packages' });

  return (
    <div>
      <div className="border-b bg-brand-cream">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-maroon">
            Groom packages
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold text-brand-maroon-dark md:text-5xl">
            Best Unisex Salon in Vadodara
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Luxury beauty &amp; grooming for the groom — sharp, camera-ready styling for every
            function of the wedding.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        {packages.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-lg" />
            ))}
          </div>
        ) : packages.isError ? (
          <SectionError
            className="py-16"
            message="Couldn't load groom packages right now."
            onRetry={() => packages.refetch()}
          />
        ) : !packages.data?.length ? (
          <Card>
            <CardContent className="p-16 text-center">
              <p className="font-medium">No groom packages available right now.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:mx-auto lg:max-w-3xl">
            {packages.data.map((pkg) => (
              <PackageTierCard
                key={pkg.id}
                pkg={pkg}
                bookHref={bookHref}
                highlight={
                  pkg.name === 'Groom Package — Signature Artist' ? 'Signature Artist' : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GroomPackagesPage;
