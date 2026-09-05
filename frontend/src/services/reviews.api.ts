import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface ReviewDto {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  customer_id: string;
  customer_name: string;
  customer_avatar: string | null;
  staff_id: string | null;
  staff_name: string | null;
}

export function useReviews(staffId?: string) {
  return useQuery({
    queryKey: ['reviews', staffId ?? 'all'],
    queryFn: async () => {
      const { data } = await api.get('/reviews', {
        params: staffId ? { staffId } : undefined,
      });
      return data.data as ReviewDto[];
    },
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      staffId?: string | null;
      appointmentId?: string;
      rating: number;
      comment: string;
    }) => (await api.post('/reviews', body)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  });
}
