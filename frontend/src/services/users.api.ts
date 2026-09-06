import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import type { NotificationPrefs, User } from '@/types';

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  visits: number;
  lifetime_inr: string;
}

// Unpaginated — returns every customer. Only for the couple of internal
// pickers that need the full list to search client-side as someone types
// (Quick Bill's "existing customer" search, staff booking-for-a-customer):
// omitting page/pageSize entirely puts the backend in its "give me
// everything" mode (see users.routes.ts). Not for anywhere rendering a
// full table — use useCustomersPaged for that.
export function useCustomers(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get('/users/customers')).data.data as CustomerRow[],
    enabled: opts?.enabled ?? true,
  });
}

export interface PaginatedCustomers {
  data: CustomerRow[];
  page: number;
  pageSize: number;
  total: number;
}

// Genuinely paginated + server-side searched — for the admin Customers
// table, which used to fetch this same unbounded list and filter/paginate
// it entirely client-side.
export function useCustomersPaged(filters: { q?: string; page: number; pageSize: number }) {
  return useQuery({
    queryKey: ['customers', 'paged', filters],
    queryFn: async () => {
      const { data } = await api.get('/users/customers', { params: filters });
      return data as PaginatedCustomers;
    },
    placeholderData: (prev) => prev,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const setUser = (patch: Partial<User>) => useAuthStore.getState().updateProfile(patch);
  return useMutation({
    mutationFn: async (patch: {
      name?: string;
      phone?: string;
      avatarUrl?: string;
      notificationPrefs?: Partial<NotificationPrefs>;
    }) => (await api.patch('/users/me', patch)).data.data.user as User,
    onSuccess: (user) => {
      setUser(user);
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function useUploadAvatar() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('image', file);
      const { data } = await api.post('/uploads/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data.url as string;
    },
  });
}

// -------------------- Walk-in creation + detail view --------------------

export interface WalkInInput {
  name: string;
  email?: string;
  phone?: string;
  visit?: {
    serviceIds: string[];
    staffId?: string | null;
    date: string;
    startTime: string;
    notes?: string;
  };
}

export function useCreateWalkInCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: WalkInInput) => (await api.post('/users/customers', body)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export interface CustomerAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  total_inr: string;
  notes: string | null;
  staff_name: string | null;
  service_names: string[];
}

export interface CustomerSalePayment {
  method: 'cash' | 'card' | 'upi';
  amount: string;
}

export interface CustomerSale {
  id: string;
  appointment_id: string | null;
  staff_id: string | null;
  staff_name: string | null;
  subtotal_inr: string;
  discount_inr: string;
  total_inr: string;
  status: 'completed' | 'void';
  coupon_code: string | null;
  coupon_discount_inr: string;
  created_at: string;
  item_count: string;
  item_names: string[];
  payments: CustomerSalePayment[];
}

export interface CustomerDetail {
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    created_at: string;
    is_active: boolean;
    last_login_at: string | null;
  };
  stats: {
    totalVisits: number;
    completed: number;
    upcoming: number;
    cancelled: number;
    totalBills: number;
    totalSpend_inr: number;
    avgBill_inr: number;
    lastVisitAt: string | null;
    lifetime_inr: number;
  };
  appointments: CustomerAppointment[];
  sales: CustomerSale[];
}

export function useCustomerDetail(id: string | null) {
  return useQuery({
    enabled: !!id,
    queryKey: ['customer-detail', id],
    queryFn: async () => (await api.get(`/users/customers/${id}`)).data.data as CustomerDetail,
  });
}
