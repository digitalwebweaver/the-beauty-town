import { useState } from 'react';
import FallbackImage from '@/components/common/FallbackImage';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ServiceSection } from '@/lib/serviceSections';

interface ServiceCategorySectionProps {
  section: ServiceSection;
  /** Alternates the photo/price-table sides down the page, like the real site. */
  reverse?: boolean;
}

// This page's sections are a fixed, curated menu (bounded by the rule list
// in serviceSections.ts, not by total data volume), so this isn't the same
// "grows without bound" risk as an admin table — but a section with an
// unusually long list of named variants (e.g. every nail-art style) still
// shouldn't dump dozens of rows into the page at once with no windowing at
// all, so long lists collapse behind a "Show all" toggle instead.
const INITIAL_VISIBLE = 12;

function ServiceCategorySection({ section, reverse = false }: ServiceCategorySectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [mainImage, accentImage] = section.images;
  const visibleServices =
    expanded || section.services.length <= INITIAL_VISIBLE
      ? section.services
      : section.services.slice(0, INITIAL_VISIBLE);
  const hiddenCount = section.services.length - visibleServices.length;

  return (
    <section className="grid items-center gap-10 py-10 md:grid-cols-2 md:gap-14 md:py-14">
      <div className={cn('relative mx-auto w-full max-w-md md:mx-0', reverse && 'md:order-2')}>
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl shadow-md">
          <FallbackImage
            src={mainImage}
            alt={section.title}
            className="h-full w-full object-cover"
          />
        </div>
        {accentImage && (
          <div className="absolute -bottom-6 -right-6 hidden aspect-square w-28 overflow-hidden rounded-xl border-4 border-white shadow-lg sm:block md:w-36">
            <FallbackImage src={accentImage} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="absolute left-4 top-4 rounded-lg bg-brand-maroon-dark px-4 py-2 shadow-md">
          <p className="font-display text-sm font-semibold tracking-wide text-white">
            {section.title}
          </p>
        </div>
      </div>

      <div className={cn(reverse && 'md:order-1')}>
        <h2 className="font-display text-2xl font-semibold text-brand-maroon-dark md:text-3xl">
          {section.title}
        </h2>
        <div className="mt-5 divide-y overflow-hidden rounded-xl border bg-card">
          {visibleServices.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.duration_minutes} min</p>
              </div>
              <p className="whitespace-nowrap text-sm font-semibold text-brand-maroon">
                ₹{Number(s.price_inr).toLocaleString('en-IN')}/-
              </p>
            </div>
          ))}
        </div>
        {hiddenCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setExpanded(true)}
          >
            Show all {section.services.length} ({hiddenCount} more)
          </Button>
        )}
      </div>
    </section>
  );
}

export default ServiceCategorySection;
