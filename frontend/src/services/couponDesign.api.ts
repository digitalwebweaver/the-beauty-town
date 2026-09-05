import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { CouponDesign } from '@/lib/couponDesign';

export interface CouponTemplateDesignDto {
  id: number;
  design: CouponDesign;
  updated_by: string | null;
  updated_at: string;
}

const KEY = ['coupon-design'];

export function useCouponDesign() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get('/coupon-design')).data.data as CouponTemplateDesignDto,
  });
}

export function useSaveCouponDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (design: CouponDesign) =>
      (await api.put('/coupon-design', { design })).data.data as CouponTemplateDesignDto,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export async function uploadCouponDesignImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('image', file);
  const { data } = await api.post('/uploads/coupon-design', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.url as string;
}
