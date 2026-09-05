import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
  /** Auto-advance interval in ms. Set 0 to disable. */
  intervalMs?: number;
}

// A small, dependency-free fade carousel with dot indicators — used for the
// About page's "Payal Shah award" hero slideshow and the Our Story mini
// gallery, mirroring the real site's own image carousels there.
function ImageCarousel({ images, alt, className, intervalMs = 4000 }: ImageCarouselProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!intervalMs || images.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % images.length), intervalMs);
    return () => clearInterval(id);
  }, [images.length, intervalMs]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={`${alt} ${i + 1}`}
          loading={i === 0 ? 'eager' : 'lazy'}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
            i === index ? 'opacity-100' : 'opacity-0'
          )}
        />
      ))}
      {images.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/60'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ImageCarousel;
