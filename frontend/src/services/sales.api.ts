import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export type PaymentMethod = 'cash' | 'card' | 'upi';
export type SaleStatus = 'completed' | 'void';

export interface SaleLineItemDto {
  id: string;
  itemType: 'service' | 'product' | 'package';
  name: string;
  unitPrice: string;
  quantity: number;
  discount: string;
  lineTotal: string;
}

export interface SalePaymentDto {
  method: PaymentMethod;
  amount: string;
}

export interface SaleDetailDto {
  id: string;
  appointment_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  staff_id: string | null;
  staff_name: string | null;
  subtotal_inr: string;
  discount_inr: string;
  total_inr: string;
  coupon_id: string | null;
  coupon_code: string | null;
  coupon_discount_inr: string;
  status: SaleStatus;
  notes: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
  items: SaleLineItemDto[];
  payments: SalePaymentDto[];
}

export interface SaleListItemDto {
  id: string;
  appointment_id: string | null;
  customer_name: string | null;
  staff_name: string | null;
  subtotal_inr: string;
  discount_inr: string;
  total_inr: string;
  status: SaleStatus;
  created_at: string;
  item_count: string;
}

const KEY = ['sales'];

export interface CreateSaleItemInput {
  type: 'service' | 'product' | 'package';
  id: string;
  quantity: number;
  discountInr: number;
}

export interface CreateSalePaymentInput {
  method: PaymentMethod;
  amountInr: number;
}

export interface CreateSaleInput {
  appointmentId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: CreateSaleItemInput[];
  discountInr: number;
  couponCode?: string;
  payments: CreateSalePaymentInput[];
  notes?: string;
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateSaleInput) =>
      (await api.post('/sales', body)).data.data as SaleDetailDto,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useSales(filters?: {
  status?: string;
  staffId?: string;
  from?: string;
  to?: string;
  q?: string;
}) {
  return useQuery({
    queryKey: [...KEY, 'all', filters ?? {}],
    queryFn: async () => {
      const { data } = await api.get('/sales', { params: filters });
      return data.data as SaleListItemDto[];
    },
  });
}

export function useMySales() {
  return useQuery({
    queryKey: [...KEY, 'mine'],
    queryFn: async () => (await api.get('/sales/mine')).data.data as SaleListItemDto[],
  });
}

export function useSaleDetail(id: string | null) {
  return useQuery({
    enabled: !!id,
    queryKey: [...KEY, 'detail', id],
    queryFn: async () => (await api.get(`/sales/${id}`)).data.data as SaleDetailDto,
  });
}

// Public invoice link — no auth required, used by the standalone
// /invoice/:id page so it opens for anyone with the link (e.g. from WhatsApp).
export function useInvoice(id: string | null) {
  return useQuery({
    enabled: !!id,
    queryKey: [...KEY, 'invoice', id],
    queryFn: async () => (await api.get(`/sales/${id}/public`)).data.data as SaleDetailDto,
  });
}

export function useVoidSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) =>
      (await api.patch(`/sales/${id}/void`, { reason })).data.data as SaleDetailDto,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
