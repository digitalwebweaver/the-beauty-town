import { useEffect, useState } from 'react';

const DISMISS_KEY = 'beauty-town-install-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari's own (non-standard) flag for "launched from home screen".
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Drives the "Install app" banner. Android/Chrome fires a real
 * `beforeinstallprompt` event we can capture and replay on demand; iOS has
 * no such API at all, so there the banner just shows manual "Add to Home
 * Screen" instructions instead of a button. Either way, it never appears
 * once already installed, and a dismissal is remembered so it isn't naggy.
 */
export function useInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1'
  );

  useEffect(() => {
    if (isStandalone()) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Private browsing / storage disabled — dismissal just won't persist
      // across reloads, which is a harmless degradation.
    }
  };

  const install = async () => {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    setDeferredEvent(null);
    if (outcome === 'accepted') dismiss();
  };

  const standalone = isStandalone();
  const ios = isIos();

  return {
    // Android/Chrome: only once the browser has actually said it's
    // installable. iOS: no such signal exists, so show the manual-steps
    // variant any time it isn't already installed.
    visible: !standalone && !dismissed && (!!deferredEvent || ios),
    canPromptDirectly: !!deferredEvent,
    isIos: ios,
    install,
    dismiss,
  };
}
