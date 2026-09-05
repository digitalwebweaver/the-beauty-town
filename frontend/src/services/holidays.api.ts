import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface HolidayDto {
  id: string;
  holiday_date: string;
  reason: string | null;
  created_at: string;
}

export interface HolidayInput {
  date: string; // YYYY-MM-DD
  reason?: string;
}

const KEY = ['holidays'];

// Public — used by both the customer-facing booking date-picker (filtered
// to "from today" client-side) and the admin Holidays page (shows all).
export function useHolidays() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get('/holidays')).data.data as HolidayDto[],
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: HolidayInput) =>
      (await api.post('/holidays', body)).data.data as HolidayDto,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/holidays/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
