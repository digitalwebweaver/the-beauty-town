import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export type CouponDiscountType = 'flat' | 'percent';
export type CouponScope = 'bill' | 'items';

export interface CouponItemDto {
  item_type: 'service' | 'product';
  service_id: string | null;
  product_id: string | null;
  name: string;
}

export interface CouponDto {
  id: string;
  code: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_value: string;
  max_discount_inr: string | null;
  min_spend_inr: string;
  scope: CouponScope;
  starts_at: string | null;
  expires_at: string | null;
  max_redemptions: number | null;
  redemptions_count: number;
  per_customer_limit: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  item_count?: string;
  items?: CouponItemDto[];
}

const KEY = ['coupons'];

export function useCoupons() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get('/coupons')).data.data as CouponDto[],
  });
}

export function useCoupon(id: string | null) {
  return useQuery({
    enabled: !!id,
    queryKey: [...KEY, 'detail', id],
    queryFn: async () => (await api.get(`/coupons/${id}`)).data.data as CouponDto,
  });
}

export interface CouponItemInput {
  type: 'service' | 'product';
  id: string;
}

export interface CouponFormInput {
  code: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountInr?: number;
  minSpendInr: number;
  scope: CouponScope;
  items: CouponItemInput[];
  startsAt?: string;
  expiresAt?: string;
  maxRedemptions?: number;
  perCustomerLimit?: number;
  isActive: boolean;
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CouponFormInput) =>
      (await api.post('/coupons', body)).data.data as CouponDto,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CouponFormInput> & { id: string }) =>
      (await api.patch(`/coupons/${id}`, patch)).data.data as CouponDto,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export interface CouponPreviewResult {
  valid: boolean;
  reason?: string;
  discountInr: number;
  coupon?: CouponDto;
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: async (body: {
      code: string;
      subtotalInr: number;
      items: { type: 'service' | 'product' | 'package'; id: string; lineTotalInr: number }[];
      customerPhone?: string;
    }) => (await api.post('/coupons/preview', body)).data.data as CouponPreviewResult,
  });
}
