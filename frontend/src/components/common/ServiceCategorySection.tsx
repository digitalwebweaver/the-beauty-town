import FallbackImage from '@/components/common/FallbackImage';
import { cn } from '@/lib/utils';
import type { ServiceSection } from '@/lib/serviceSections';

interface ServiceCategorySectionProps {
  section: ServiceSection;
  /** Alternates the photo/price-table sides down the page, like the real site. */
  reverse?: boolean;
}

function ServiceCategorySection({ section, reverse = false }: ServiceCategorySectionProps) {
  const [mainImage, accentImage] = section.images;

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
          {section.services.map((s) => (
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
      </div>
    </section>
  );
}

export default ServiceCategorySection;
