import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '@/config/env';

export interface AccessTokenPayload {
  sub: string;
  role: 'customer' | 'staff' | 'admin';
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.ACCESS_TOKEN_SECRET) as AccessTokenPayload;
}

export function generateRefreshToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(48).toString('base64url');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshTokenExpiryDate(): Date {
  const ttl = env.REFRESH_TOKEN_TTL;
  const days = parseTtlDays(ttl);
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function parseTtlDays(ttl: string): number {
  const m = ttl.match(/^(\d+)([dhm])$/);
  if (!m) return 30;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  if (unit === 'd') return n;
  if (unit === 'h') return n / 24;
  if (unit === 'm') return n / (24 * 60);
  return 30;
}
