import { Loader2 } from 'lucide-react';

/** Suspense fallback while a lazily-loaded page chunk is fetching. */
function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default PageLoader;
