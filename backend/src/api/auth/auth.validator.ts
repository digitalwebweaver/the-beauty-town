import { z } from 'zod';
import { nameField, newPasswordField, phoneField } from '@/utils/zodHelpers';

const email = z
  .string()
  .email()
  .max(180)
  .transform((s) => s.trim().toLowerCase());

export const requestOtpSchema = z.object({
  email,
  name: nameField(1, 120).optional(),
});

export const verifyOtpSchema = z.object({
  email,
  otp: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

export const registerCustomerSchema = z.object({
  name: nameField(2, 120),
  email,
  phone: phoneField().optional(),
  password: newPasswordField(),
});

export const staffAdminLoginSchema = z.object({
  email,
  password: z.string().min(6).max(128),
});

export const googleTokenSchema = z.object({
  idToken: z.string().min(10),
});

export const requestPasswordResetSchema = z.object({
  email,
});

export const confirmPasswordResetSchema = z.object({
  email,
  otp: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'Code must be 6 digits'),
  newPassword: newPasswordField(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: newPasswordField(),
});
