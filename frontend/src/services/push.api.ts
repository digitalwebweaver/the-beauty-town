import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

export function useVapidPublicKey() {
  return useQuery({
    queryKey: ['push', 'vapid-public-key'],
    queryFn: async () =>
      (await api.get('/push/vapid-public-key')).data.data as { publicKey: string | null },
    staleTime: Infinity, // never changes without a server redeploy
  });
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export function useSubscribePush() {
  return useMutation({
    mutationFn: async (body: PushSubscriptionInput) =>
      (await api.post('/push/subscribe', body)).data.data,
  });
}

export function useUnsubscribePush() {
  return useMutation({
    mutationFn: async (endpoint: string) =>
      (await api.delete('/push/subscribe', { params: { endpoint } })).data.data,
  });
}
