import { useEffect, useState } from 'react';
import api from '@/lib/axios';

export type ConnectionState = 'online' | 'offline' | 'checking';

const CHECK_INTERVAL_MS = 20_000;

/**
 * More useful than plain `navigator.onLine` for a back-office tool: that
 * flag only reflects the OS's network interface state, so it stays "true"
 * on a WiFi network with no real internet, or when the salon's own server
 * is down but the browser's connection is otherwise fine. This combines
 * the instant browser signal with a periodic real ping to the actual API
 * (reusing the existing /api/health endpoint) — "online" here means the
 * app can actually reach the server right now, not just that the OS thinks
 * it has a network.
 */
export function useOnlineStatus(): { status: ConnectionState } {
  const [browserOnline, setBrowserOnline] = useState(
    typeof navigator === 'undefined' || navigator.onLine
  );
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);

  useEffect(() => {
    const goOnline = () => setBrowserOnline(true);
    const goOffline = () => setBrowserOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      if (!browserOnline) {
        if (!cancelled) setServerReachable(false);
        return;
      }
      try {
        await api.get('/health', { timeout: 5000 });
        if (!cancelled) setServerReachable(true);
      } catch {
        if (!cancelled) setServerReachable(false);
      }
    }

    ping();
    const id = setInterval(ping, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [browserOnline]);

  const status: ConnectionState =
    !browserOnline || serverReachable === false
      ? 'offline'
      : serverReachable === null
        ? 'checking'
        : 'online';

  return { status };
}
