import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface StaffDto {
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role_title: string;
  bio: string | null;
  rating: string;
  experience_years: number;
  is_active: boolean;
  specialties: string[];
}

const KEY = ['staff'];

export function useStaff(opts?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: [...KEY, opts ?? {}],
    queryFn: async () => {
      const { data } = await api.get('/staff', {
        params: opts?.includeInactive ? { includeInactive: true } : {},
      });
      return data.data as StaffDto[];
    },
  });
}

export interface CreateStaffInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  roleTitle: string;
  bio?: string;
  experienceYears?: number;
  specialties: string[];
  avatarUrl?: string;
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateStaffInput) =>
      (await api.post('/staff', body)).data.data as StaffDto,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export interface UpdateStaffInput {
  id: string;
  name?: string;
  phone?: string;
  avatarUrl?: string;
  roleTitle?: string;
  bio?: string;
  experienceYears?: number;
  rating?: number;
  isActive?: boolean;
  specialties?: string[];
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateStaffInput) =>
      (await api.patch(`/staff/${id}`, patch)).data.data as StaffDto,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeactivateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/staff/${id}`)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export interface AvailableStaffDto {
  user_id: string;
  name: string;
  avatar_url: string | null;
  role_title: string;
  rating: string;
}

/**
 * Returns staff who are FREE in the given time window on the given date.
 * Optionally excludes one staff (typically the one being transferred FROM).
 */
export function useAvailableStaff(params: {
  date?: string;
  startTime?: string;
  endTime?: string;
  excludeStaffId?: string | null;
}) {
  const { date, startTime, endTime, excludeStaffId } = params;
  const enabled = !!(date && startTime && endTime);
  return useQuery({
    enabled,
    queryKey: ['staff', 'available', date, startTime, endTime, excludeStaffId ?? null],
    queryFn: async () => {
      const q: Record<string, unknown> = { date, startTime, endTime };
      if (excludeStaffId) q.exclude = excludeStaffId;
      const { data } = await api.get('/staff/available', { params: q });
      return data.data as AvailableStaffDto[];
    },
  });
}

// -------------------- Own weekly availability (Schedule page) --------------------

export interface AvailabilityDayDto {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  dayLabel: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export function useMyAvailability() {
  return useQuery({
    queryKey: [...KEY, 'availability', 'mine'],
    queryFn: async () => (await api.get('/staff/availability')).data.data as AvailabilityDayDto[],
  });
}

export interface SaveAvailabilityDay {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime?: string;
  endTime?: string;
}

export function useSaveMyAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (days: SaveAvailabilityDay[]) =>
      (await api.put('/staff/availability', { days })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'availability', 'mine'] }),
  });
}
