import { useState } from 'react';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CouponDesignCanvas from '@/components/common/CouponDesignCanvas';
import { DEFAULT_DESIGN } from '@/lib/couponDesign';
import { useSettings, SETTINGS_FALLBACK } from '@/services/settings.api';
import { useCouponDesign } from '@/services/couponDesign.api';
import type { CouponDto } from '@/services/coupons.api';

const COPIES_PER_SHEET = 8;

function CouponTemplate({ coupon, onClose }: { coupon: CouponDto | null; onClose: () => void }) {
  const settings = useSettings().data ?? SETTINGS_FALLBACK;
  const designQuery = useCouponDesign();
  const [printed, setPrinted] = useState(false);

  // The saved layout — falling back to the built-in starter whenever it has
  // never been customized in the designer yet (empty elements list).
  const design =
    designQuery.data && designQuery.data.design.elements.length > 0
      ? designQuery.data.design
      : DEFAULT_DESIGN;

  // The canvas renders at its real design.width (usually ~440px) with no
  // scaling by default — fine on desktop, but wider than most phones. A
  // one-time "does it fit?" check (not a live resize listener — this is a
  // short-lived preview dialog) shrinks it to fit the screen instead.
  const previewScale =
    typeof window !== 'undefined' && window.innerWidth - 64 < design.width
      ? Math.max(0.5, (window.innerWidth - 64) / design.width)
      : 1;

  const print = () => {
    let styleEl = document.getElementById('coupon-print-page-size') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'coupon-print-page-size';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = '@page { size: A4; margin: 10mm; }';
    setPrinted(true);
    setTimeout(() => window.print(), 50);
  };

  return (
    <Dialog open={!!coupon} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-fit print:static print:top-0 print:left-0 print:w-auto print:max-w-none print:translate-x-0 print:translate-y-0 print:rounded-none print:bg-white print:p-0 print:shadow-none print:ring-0">
        {coupon && (
          <>
            <DialogHeader className="print:hidden">
              <DialogTitle>Print coupon — {coupon.code}</DialogTitle>
              <DialogDescription>
                Uses the layout from the coupon designer, auto-filled with this coupon's details.
                Prints {COPIES_PER_SHEET} copies on an A4 sheet, ready to cut and hand out.
              </DialogDescription>
            </DialogHeader>

            <div className="print:hidden">
              {designQuery.isLoading ? (
                <div className="flex h-40 items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <div className="mx-auto overflow-x-auto">
                  <CouponDesignCanvas
                    design={design}
                    coupon={coupon}
                    settings={settings}
                    scale={previewScale}
                  />
                </div>
              )}
            </div>

            {printed && (
              <div
                className="hidden grid-cols-2 place-items-center gap-4 bg-white p-4 print:grid"
                style={{ gridTemplateColumns: `repeat(2, ${design.width}px)` }}
              >
                {Array.from({ length: COPIES_PER_SHEET }).map((_, i) => (
                  <CouponDesignCanvas key={i} design={design} coupon={coupon} settings={settings} />
                ))}
              </div>
            )}

            <DialogFooter className="print:hidden">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={print}>
                <Printer className="mr-2 h-4 w-4" /> Print sheet
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CouponTemplate;
