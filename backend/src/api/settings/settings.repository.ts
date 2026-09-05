import { query } from '@/config/db';

export interface SalonSettingsRow {
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
  allow_price_override: boolean;
  appointment_notifications_enabled: boolean;
  rebooking_nudges_enabled: boolean;
  updated_at: string;
}

/**
 * There is always exactly one row (id = 1, enforced by a CHECK constraint).
 * Shared by the /api/settings routes and by anything else on the backend
 * that needs the salon's display name (e.g. the OTP email).
 */
export async function getSettings(): Promise<SalonSettingsRow> {
  const { rows } = await query<SalonSettingsRow>(`SELECT * FROM salon_settings WHERE id = 1`);
  return rows[0];
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
  allowPriceOverride?: boolean;
  appointmentNotificationsEnabled?: boolean;
  rebookingNudgesEnabled?: boolean;
}

const COLUMN_BY_KEY: Record<keyof UpdateSettingsInput, string> = {
  name: 'name',
  tagline: 'tagline',
  address: 'address',
  phone: 'phone',
  email: 'email',
  gstin: 'gstin',
  hours: 'hours',
  instagramUrl: 'instagram_url',
  facebookUrl: 'facebook_url',
  otpLoginEnabled: 'otp_login_enabled',
  allowPriceOverride: 'allow_price_override',
  appointmentNotificationsEnabled: 'appointment_notifications_enabled',
  rebookingNudgesEnabled: 'rebooking_nudges_enabled',
};

export async function updateSettings(patch: UpdateSettingsInput): Promise<SalonSettingsRow> {
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const key of Object.keys(patch) as (keyof UpdateSettingsInput)[]) {
    if (patch[key] === undefined) continue;
    params.push(patch[key]);
    sets.push(`${COLUMN_BY_KEY[key]} = $${params.length}`);
  }
  if (!sets.length) return getSettings();

  const { rows } = await query<SalonSettingsRow>(
    `UPDATE salon_settings SET ${sets.join(', ')} WHERE id = 1 RETURNING *`,
    params
  );
  return rows[0];
}
