import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import FallbackImage from '@/components/common/FallbackImage';
import SectionError from '@/components/common/SectionError';
import { ROUTES } from '@/constants/routes';
import { imageUrl } from '@/lib/imageUrl';
import { usePackages } from '@/services/packages.api';

function DestinationPackagePage() {
  const packages = usePackages({ category: 'Destination Package' });
  const pkg = packages.data?.[0];

  return (
    <div>
      <div className="border-b bg-brand-cream">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-maroon">
            Destination package
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold text-brand-maroon-dark md:text-5xl">
            Luxury Destination Weddings
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Bridal makeup that travels with you — our team comes to your venue, anywhere in Gujarat
            and beyond.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        {packages.isLoading ? (
          <div className="grid gap-10 md:grid-cols-2">
            <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
            <Skeleton className="h-96 rounded-lg" />
          </div>
        ) : packages.isError ? (
          <SectionError
            className="py-16"
            message="Couldn't load the destination package right now."
            onRetry={() => packages.refetch()}
          />
        ) : !pkg ? (
          <Card>
            <CardContent className="p-16 text-center">
              <p className="font-medium">The destination package isn&apos;t available right now.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div className="relative mx-auto w-full max-w-md md:mx-0">
              <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl shadow-md">
                <FallbackImage
                  src={imageUrl(pkg.image_url)}
                  alt={pkg.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute left-4 top-4 rounded-lg bg-brand-maroon-dark px-4 py-2 shadow-md">
                <p className="font-display text-sm font-semibold tracking-wide text-white">
                  Destination Package
                </p>
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-brand-maroon-dark md:text-3xl">
                {pkg.name}
              </h2>
              <p className="mt-2 text-3xl font-bold text-brand-maroon">
                ₹{Number(pkg.price_inr).toLocaleString('en-IN')}
                <span className="text-base font-normal text-muted-foreground">/-</span>
              </p>

              <ul className="mt-5 space-y-2 text-sm">
                {pkg.inclusions.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-maroon" />
                    <span className="text-foreground">{line}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className="mt-6 w-full bg-brand-maroon text-white hover:bg-brand-maroon/90 sm:w-auto"
              >
                <Link to={`${ROUTES.contact}?package=${encodeURIComponent(pkg.name)}`}>
                  Enquire Now
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DestinationPackagePage;
