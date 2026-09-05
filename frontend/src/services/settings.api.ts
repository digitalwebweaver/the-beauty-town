import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { SALON_INFO } from '@/lib/mockData';

export interface SettingsDto {
  id: number;
  name: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  hours: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  otp_login_enabled: boolean;
  updated_at: string;
}

const KEY = ['settings'];

// Shaped exactly like a SettingsDto so it can stand in for real data on
// first paint (Navbar/Footer render before any query has resolved, even
// for a logged-out visitor) — replaced the instant the real row loads.
export const SETTINGS_FALLBACK: SettingsDto = {
  id: 1,
  name: SALON_INFO.name,
  tagline: SALON_INFO.tagline,
  address: SALON_INFO.address,
  phone: SALON_INFO.phone,
  email: SALON_INFO.email,
  gstin: SALON_INFO.gstin || null,
  hours: SALON_INFO.hours,
  instagram_url: SALON_INFO.socials.instagram,
  facebook_url: SALON_INFO.socials.facebook,
  otp_login_enabled: false,
  updated_at: '',
};

export function useSettings() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get('/settings')).data.data as SettingsDto,
    placeholderData: SETTINGS_FALLBACK,
  });
}

export interface UpdateSettingsInput {
  name?: string;
  tagline?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  hours?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  otpLoginEnabled?: boolean;
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: UpdateSettingsInput) =>
      (await api.patch('/settings', patch)).data.data as SettingsDto,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
