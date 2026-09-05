import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface ServiceCategoryDto {
  id: string;
  key: string;
  label: string;
  display_order: number;
}

export interface ServiceDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  gender: 'male' | 'female' | 'unisex';
  price_inr: string;
  duration_minutes: number;
  image_url: string | null;
  is_active: boolean;
  max_concurrent_bookings: number | null;
  category_key: string;
  category_label: string;
}

const KEY = ['services'];

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/services/categories')).data.data as ServiceCategoryDto[],
  });
}

export function useServices(filters?: { categoryKey?: string; gender?: string; q?: string }) {
  return useQuery({
    queryKey: [...KEY, filters ?? {}],
    queryFn: async () => {
      const { data } = await api.get('/services', { params: filters });
      return data.data as ServiceDto[];
    },
  });
}

export interface PaginatedServices {
  data: ServiceDto[];
  page: number;
  pageSize: number;
  total: number;
}

// Admin listing — sees archived services too, and is genuinely paginated
// server-side since the real catalog runs into the hundreds. Distinct from
// useServices() (public, active-only, unpaginated) which several other
// pickers (booking flow, POS, coupon items, package linking) rely on
// getting back as a full flat array.
export function useAdminServices(filters: {
  categoryKey?: string;
  gender?: string;
  q?: string;
  status?: 'active' | 'archived' | 'all';
  page: number;
  pageSize: number;
}) {
  return useQuery({
    queryKey: [...KEY, 'admin', filters],
    queryFn: async () => {
      const { data } = await api.get('/services/admin', { params: filters });
      return data as PaginatedServices;
    },
    placeholderData: (prev) => prev,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      categoryId: string;
      name: string;
      description?: string;
      gender: 'male' | 'female' | 'unisex';
      priceInr: number;
      durationMinutes: number;
      imageUrl?: string;
      maxConcurrentBookings?: number;
    }) => (await api.post('/services', body)).data.data as ServiceDto,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: string;
      name?: string;
      description?: string;
      gender?: 'male' | 'female' | 'unisex';
      priceInr?: number;
      durationMinutes?: number;
      imageUrl?: string;
      isActive?: boolean;
      categoryId?: string;
      maxConcurrentBookings?: number | null;
    }) => (await api.patch(`/services/${id}`, patch)).data.data as ServiceDto,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/services/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
