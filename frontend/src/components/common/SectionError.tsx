import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// A minimal inline error state for a page section whose data fetch failed —
// so a failed request reads as "couldn't load this" rather than silently
// rendering an empty section that looks like "there's nothing here."
function SectionError({
  message = "Couldn't load this right now.",
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`col-span-full flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground ${className ?? ''}`}
    >
      <AlertTriangle className="h-5 w-5" />
      {message}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw className="mr-2 h-3.5 w-3.5" /> Try again
        </Button>
      )}
    </div>
  );
}

export default SectionError;
