import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { env } from '@/config/env';

export function generateOtp(length = env.OTP_LENGTH): string {
  const max = 10 ** length;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(length, '0');
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}
