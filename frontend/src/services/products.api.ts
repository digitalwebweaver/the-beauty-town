import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface ProductDto {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  stock: number;
  price_inr: string;
  reorder_level: number;
  is_active: boolean;
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/products')).data.data as ProductDto[],
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: string;
      name?: string;
      brand?: string;
      category?: string;
      stock?: number;
      priceInr?: number;
      reorderLevel?: number;
      isActive?: boolean;
    }) => (await api.patch(`/products/${id}`, patch)).data.data as ProductDto,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}
