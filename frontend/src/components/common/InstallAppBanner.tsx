import { Download, Share, SquarePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

// Back-office only (admin/staff) — a customer has no reason to install the
// staff app. Self-guards on role and on install/dismiss state, so it's safe
// to render unconditionally from DashboardLayout.
function InstallAppBanner() {
  const { role } = useAuth();
  const { visible, canPromptDirectly, isIos, install, dismiss } = useInstallPrompt();

  if ((role !== 'admin' && role !== 'staff') || !visible) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 md:items-center md:p-4">
      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary md:mt-0">
        <Download className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Install this app on your phone or tablet</p>
        {isIos && !canPromptDirectly ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tap <Share className="inline h-3 w-3 align-text-bottom" /> Share, then{' '}
            <SquarePlus className="inline h-3 w-3 align-text-bottom" /> "Add to Home Screen" — get
            bookings and notifications without opening a browser.
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Get booking and cancellation alerts instantly, and skip typing in the address every
            time.
          </p>
        )}
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        {canPromptDirectly && (
          <Button size="sm" onClick={install}>
            Install
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default InstallAppBanner;
