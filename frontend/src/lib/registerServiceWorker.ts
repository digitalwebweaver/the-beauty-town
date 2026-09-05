/**
 * Registers the service worker backing the installable PWA (and, in a
 * later phase, push notifications). No-ops quietly in browsers without
 * support and in any non-secure context — service workers require HTTPS
 * or `localhost`, so local dev over plain HTTP on a LAN IP simply won't
 * register one, which is fine (nothing here is required for the app to
 * otherwise work normally).
 */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err: unknown) => {
      console.error('Service worker registration failed', err);
    });
  });
}
