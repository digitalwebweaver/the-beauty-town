import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import FallbackImage from '@/components/common/FallbackImage';
import { ROUTES } from '@/constants/routes';
import { imageUrl } from '@/lib/imageUrl';
import type { PackageDto } from '@/services/packages.api';

interface PackageTierCardProps {
  pkg: PackageDto;
  bookHref: string;
  /** Shown as a small maroon ribbon in the top-right corner, e.g. "Most Popular". */
  highlight?: string;
}

// These bridal/groom/destination tiers are priced custom consultations, not
// simple pre-built service bundles — they render an "Enquire Now" CTA into
// the contact form (pre-filled with the package name) rather than a direct
// booking flow, same as the generic PackagesPage already does for any
// non-bookable package.
function PackageTierCard({ pkg, bookHref, highlight }: PackageTierCardProps) {
  const price = Number(pkg.price_inr);

  return (
    <Card className="relative flex flex-col overflow-hidden pt-0">
      {highlight && (
        <div className="absolute right-3 top-3 z-10 rounded-full bg-brand-maroon px-3 py-1 text-xs font-semibold text-white shadow">
          {highlight}
        </div>
      )}
      <FallbackImage
        src={imageUrl(pkg.image_url)}
        alt={pkg.name}
        className="h-48 w-full object-cover"
      />
      <CardContent className="flex flex-1 flex-col pt-4">
        <h3 className="font-display text-lg font-semibold text-brand-maroon-dark">{pkg.name}</h3>
        <p className="mt-1 text-2xl font-bold text-brand-maroon">
          ₹{price.toLocaleString('en-IN')}
          <span className="text-sm font-normal text-muted-foreground">/-</span>
        </p>

        <ul className="mt-4 space-y-1.5 text-sm">
          {pkg.inclusions.map((line, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand-maroon" />
              <span className="text-foreground">{line}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-5">
          {pkg.is_bookable ? (
            <Button asChild className="w-full bg-brand-maroon text-white hover:bg-brand-maroon/90">
              <Link to={`${bookHref}?package=${pkg.id}`}>Book Now</Link>
            </Button>
          ) : (
            <Button
              asChild
              variant="outline"
              className="w-full border-brand-maroon text-brand-maroon hover:bg-brand-maroon hover:text-white"
            >
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

export default PackageTierCard;
