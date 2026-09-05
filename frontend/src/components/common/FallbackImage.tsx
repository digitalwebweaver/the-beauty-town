import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FallbackImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
}

/**
 * A plain <img> that degrades to a neutral placeholder (instead of the
 * browser's broken-image glyph) whenever `src` is missing or fails to load —
 * e.g. a hardcoded demo image URL that's since gone dead. Drop-in
 * replacement for <img>: same props, same className applies to both states.
 */
function FallbackImage({ src, alt, className, loading = 'lazy', ...props }: FallbackImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn('flex items-center justify-center bg-muted text-muted-foreground', className)}
        role="img"
        aria-label={alt || 'Image unavailable'}
      >
        <ImageOff className="h-6 w-6 opacity-50" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setFailed(true)}
      {...props}
    />
  );
}

export default FallbackImage;
