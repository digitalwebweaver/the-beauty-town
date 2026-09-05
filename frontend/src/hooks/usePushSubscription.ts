import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSubscribePush, useUnsubscribePush, useVapidPublicKey } from '@/services/push.api';

// A VAPID public key comes back from the server as URL-safe base64 — the
// PushManager API wants raw bytes.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64Safe);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

interface SubscriptionKeys {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

function toSubscriptionInput(sub: PushSubscription): SubscriptionKeys {
  const json = sub.toJSON();
  return {
    endpoint: json.endpoint!,
    keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
  };
}

/**
 * Drives the "push notifications on this device" toggle (Profile page,
 * admin/staff only). Never auto-prompts for permission on load — that's a
 * well-known, disliked anti-pattern — `enable()` only runs from an explicit
 * user action (a button click).
 */
export function usePushSubscription() {
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied'
  );
  const [subscribed, setSubscribed] = useState(false);
  const [checking, setChecking] = useState(supported);

  const vapid = useVapidPublicKey();
  const subscribeMut = useSubscribePush();
  const unsubscribeMut = useUnsubscribePush();

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setSubscribed(!!sub);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const enable = useCallback(async () => {
    if (!supported) return toast.error("This browser doesn't support push notifications");
    if (!vapid.data?.publicKey) {
      return toast.error('Push isn’t configured on the server yet');
    }
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== 'granted') {
        return toast.error('Notification permission was not granted');
      }
      const registration = await navigator.serviceWorker.ready;
      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid.data.publicKey),
        });
      }
      await subscribeMut.mutateAsync(toSubscriptionInput(sub));
      setSubscribed(true);
      toast.success('Push notifications enabled on this device');
    } catch {
      toast.error('Could not enable push notifications');
    }
  }, [supported, vapid.data, subscribeMut]);

  const disable = useCallback(async () => {
    if (!supported) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await unsubscribeMut.mutateAsync(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success('Push notifications turned off on this device');
    } catch {
      toast.error('Could not disable push notifications');
    }
  }, [supported, unsubscribeMut]);

  return {
    supported,
    permission,
    subscribed,
    loading: checking || subscribeMut.isPending || unsubscribeMut.isPending,
    enable,
    disable,
  };
}
