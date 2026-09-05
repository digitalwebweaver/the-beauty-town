import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface PackageServiceDto {
  id: string;
  name: string;
  priceInr: number;
  durationMinutes: number;
}

export interface PackageDto {
  id: string;
  name: string;
  slug: string;
  category: string;
  gender: 'male' | 'female' | 'unisex';
  description: string | null;
  price_inr: string;
  worth_inr: string | null;
  validity_label: string | null;
  inclusions: string[];
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  services: PackageServiceDto[];
  is_bookable: boolean;
}

export interface PackageInput {
  name: string;
  category: string;
  gender: 'male' | 'female' | 'unisex';
  description?: string;
  priceInr: number;
  worthInr?: number;
  validityLabel?: string;
  inclusions: string[];
  imageUrl?: string;
  serviceIds: string[];
  displayOrder?: number;
}

const KEY = ['packages'];

// Public/active-only — used by the customer-facing Packages page, the
// booking flow, and Quick Bill's package tab.
export function usePackages(filters?: { category?: string; gender?: string }) {
  return useQuery({
    queryKey: [...KEY, filters ?? {}],
    queryFn: async () => {
      const { data } = await api.get('/packages', { params: filters });
      return data.data as PackageDto[];
    },
  });
}

export function usePackage(id?: string) {
  return useQuery({
    queryKey: [...KEY, 'detail', id],
    queryFn: async () => (await api.get(`/packages/${id}`)).data.data as PackageDto,
    enabled: !!id,
  });
}

// Admin — every package, including inactive ones.
export function useAdminPackages() {
  return useQuery({
    queryKey: [...KEY, 'admin'],
    queryFn: async () => (await api.get('/packages/admin')).data.data as PackageDto[],
  });
}

export function useCreatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: PackageInput) =>
      (await api.post('/packages', body)).data.data as PackageDto,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: Partial<PackageInput> & { id: string; isActive?: boolean }) =>
      (await api.patch(`/packages/${id}`, patch)).data.data as PackageDto,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeletePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/packages/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
