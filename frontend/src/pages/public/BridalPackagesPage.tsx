import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import SectionError from '@/components/common/SectionError';
import PackageTierCard from '@/components/common/PackageTierCard';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { usePackages } from '@/services/packages.api';

const MIRROR_LOOKS = [
  'Mehndi Look',
  'Garba Look',
  'Grahshanti Look',
  'Bridal Makeup',
  'Reception Look',
  'Haldi Look',
  'Mandav Murat',
];

function BridalPackagesPage() {
  const { isAuthenticated, role } = useAuth();
  const bookHref = isAuthenticated && role === 'customer' ? ROUTES.book : ROUTES.guestBook;
  const packages = usePackages({ category: 'Bridal Packages' });

  return (
    <div>
      <div className="border-b bg-brand-cream">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-maroon">
            Bridal packages
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold text-brand-maroon-dark md:text-5xl">
            Expert Wedding Makeup Artist in Vadodara
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Packages crafted to celebrate every bride&apos;s unique beauty — from traditional looks
            to contemporary styles.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        {packages.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-lg" />
            ))}
          </div>
        ) : packages.isError ? (
          <SectionError
            className="py-16"
            message="Couldn't load bridal packages right now."
            onRetry={() => packages.refetch()}
          />
        ) : !packages.data?.length ? (
          <Card>
            <CardContent className="p-16 text-center">
              <p className="font-medium">No bridal packages available right now.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {packages.data.map((pkg) => (
                <PackageTierCard
                  key={pkg.id}
                  pkg={pkg}
                  bookHref={bookHref}
                  highlight={
                    pkg.name === 'The Elite Bride' ? 'Complimentary Mom Makeup' : undefined
                  }
                />
              ))}
            </div>

            <div className="mt-12 rounded-xl border bg-brand-cream/60 p-6 md:p-8">
              <h2 className="font-display text-xl font-semibold text-brand-maroon-dark">
                Mirror Makeup, included
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Every function of your wedding gets its own look — reflected back to you before you
                step out.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {MIRROR_LOOKS.map((look) => (
                  <span
                    key={look}
                    className="rounded-full border border-brand-maroon/30 bg-white px-3 py-1 text-xs font-medium text-brand-maroon-dark"
                  >
                    {look}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BridalPackagesPage;
