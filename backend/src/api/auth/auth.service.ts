import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { env, isDev } from '@/config/env';
import { logger } from '@/config/logger';
import { ApiError } from '@/utils/ApiError';
import { generateOtp, hashOtp, verifyOtp as verifyOtpHash } from '@/utils/otp';
import { hashPassword, verifyPassword } from '@/utils/password';
import { sendOtpEmail, sendPasswordResetEmail } from '@/utils/email';
import { getSettings } from '@/api/settings/settings.repository';
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiryDate,
  signAccessToken,
} from '@/utils/jwt';
import {
  createCustomer,
  createOtp,
  findLatestActiveOtp,
  findRefreshByHash,
  findUserByEmail,
  findUserById,
  incrementFailedLogin,
  incrementOtpAttempts,
  insertRefreshToken,
  markEmailVerified,
  markOtpUsed,
  revokeAllRefreshForUser,
  revokeRefreshToken,
  updateLastLogin,
  updatePasswordHash,
  upsertGoogleCustomer,
  type DbUser,
} from './auth.repository';

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

// ---------- Customer OTP flow ----------

export async function requestLoginOtp(email: string, name: string | undefined, ipAddress?: string) {
  const settings = await getSettings();
  if (!settings.otp_login_enabled) {
    throw ApiError.badRequest('OTP login is currently disabled');
  }

  let user = await findUserByEmail(email);

  if (user && user.role !== 'customer') {
    throw ApiError.badRequest(
      'This email belongs to a staff/admin account. Please use password login.'
    );
  }

  if (!user) {
    user = await createCustomer({
      name: name ?? email.split('@')[0],
      email,
      emailVerified: false,
    });
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60_000);

  await createOtp({ email, otpHash, expiresAt, ipAddress });

  await sendOtpEmail(email, otp);

  if (isDev && !env.SMTP_HOST) {
    // Dev convenience: log OTP so you can see it in terminal. Gated on
    // isDev explicitly (not just "no SMTP configured") — a production
    // deploy that forgot to set SMTP vars must not print live OTP codes.
    logger.info(`🔑 [DEV] OTP for ${email}: ${otp}`);
  }

  return { email: user.email, expiresInMinutes: env.OTP_TTL_MINUTES };
}

export async function verifyLoginOtp(
  email: string,
  otp: string,
  meta: { userAgent?: string; ipAddress?: string } = {}
) {
  const settings = await getSettings();
  if (!settings.otp_login_enabled) {
    throw ApiError.badRequest('OTP login is currently disabled');
  }

  const record = await findLatestActiveOtp(email);
  if (!record) throw ApiError.badRequest('OTP expired or not found');

  if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
    throw ApiError.tooMany('Too many wrong attempts. Request a new OTP.');
  }

  const ok = await verifyOtpHash(otp, record.otp_hash);
  if (!ok) {
    await incrementOtpAttempts(record.id);
    throw ApiError.badRequest('Invalid OTP');
  }

  await markOtpUsed(record.id);

  const user = await findUserByEmail(email);
  if (!user) throw ApiError.internal('User missing after OTP verify');

  if (!user.email_verified) await markEmailVerified(user.id);

  return issueTokens(user, meta);
}

// ---------- Password reset (any role with a password) ----------

const PASSWORD_RESET_TTL_MINUTES = 15;

export async function requestPasswordReset(email: string, ipAddress?: string) {
  const user = await findUserByEmail(email);
  // Same response whether or not the account exists — don't let this
  // endpoint be used to enumerate registered emails.
  if (user && user.password_hash) {
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000);

    await createOtp({ email, otpHash, expiresAt, ipAddress, purpose: 'password_reset' });
    await sendPasswordResetEmail(email, otp, PASSWORD_RESET_TTL_MINUTES);

    if (isDev && !env.SMTP_HOST) {
      logger.info(`🔑 [DEV] Password reset code for ${email}: ${otp}`);
    }
  }

  return { expiresInMinutes: PASSWORD_RESET_TTL_MINUTES };
}

export async function confirmPasswordReset(email: string, otp: string, newPassword: string) {
  const record = await findLatestActiveOtp(email, 'password_reset');
  if (!record) throw ApiError.badRequest('Code expired or not found');

  if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
    throw ApiError.tooMany('Too many wrong attempts. Request a new code.');
  }

  const valid = await verifyOtpHash(otp, record.otp_hash);
  if (!valid) {
    await incrementOtpAttempts(record.id);
    throw ApiError.badRequest('Invalid code');
  }

  const user = await findUserByEmail(email);
  if (!user || !user.password_hash) throw ApiError.badRequest('Account not found');

  await markOtpUsed(record.id);
  const passwordHash = await hashPassword(newPassword);
  await updatePasswordHash(user.id, passwordHash);

  // A password reset invalidates every existing session — force re-login
  // everywhere, same defensive posture as refresh-token-reuse detection.
  await revokeAllRefreshForUser(user.id);
}

// ---------- Password login (all roles) ----------

export async function loginWithPassword(
  email: string,
  password: string,
  meta: { userAgent?: string; ipAddress?: string } = {}
) {
  const user = await findUserByEmail(email);
  if (!user || !user.password_hash) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.is_active) throw ApiError.forbidden('Account disabled');

  if (user.locked_until && user.locked_until.getTime() > Date.now()) {
    const mins = Math.ceil((user.locked_until.getTime() - Date.now()) / 60_000);
    throw ApiError.tooMany(`Account locked. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`);
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    const updated = await incrementFailedLogin(user.id);
    if (updated.locked_until) {
      throw ApiError.tooMany('Account locked for 30 minutes after 10 failed attempts.');
    }
    throw ApiError.unauthorized('Invalid email or password');
  }

  return issueTokens(user, meta);
}

// Change password while already logged in (needs the current password,
// unlike the forgot-password reset flow). Revokes every other session and
// re-issues fresh tokens for this one, same as a fresh login.
export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  meta: { userAgent?: string; ipAddress?: string } = {}
) {
  const user = await findUserById(userId);
  if (!user || !user.password_hash) throw ApiError.badRequest('Account not found');

  const ok = await verifyPassword(currentPassword, user.password_hash);
  if (!ok) throw ApiError.unauthorized('Current password is incorrect');

  const passwordHash = await hashPassword(newPassword);
  await updatePasswordHash(user.id, passwordHash);
  await revokeAllRefreshForUser(user.id);

  return issueTokens(user, meta);
}

export async function registerCustomer(
  input: { name: string; email: string; phone?: string; password: string },
  meta: { userAgent?: string; ipAddress?: string } = {}
) {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw ApiError.conflict('That email is already registered');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await createCustomer({
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash,
    emailVerified: true,
  });

  return issueTokens(user, meta);
}

// ---------- Google OAuth (idToken flow) ----------

export async function loginWithGoogle(
  idToken: string,
  meta: { userAgent?: string; ipAddress?: string } = {}
) {
  if (!googleClient) throw ApiError.badRequest('Google login is not configured on the server');

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.sub) {
    throw ApiError.badRequest('Invalid Google token');
  }

  const user = await upsertGoogleCustomer({
    email: payload.email,
    name: payload.name ?? payload.email.split('@')[0],
    googleId: payload.sub,
    avatarUrl: payload.picture,
  });

  return issueTokens(user, meta);
}

// ---------- Refresh + logout ----------

export async function rotateRefresh(
  refreshToken: string,
  meta: { userAgent?: string; ipAddress?: string } = {}
) {
  const hash = hashRefreshToken(refreshToken);
  const record = await findRefreshByHash(hash);
  if (!record) throw ApiError.unauthorized('Invalid refresh token');
  if (record.revoked_at) {
    // Token reuse! Revoke ALL tokens for this user (defensive).
    await revokeAllRefreshForUser(record.user_id);
    throw ApiError.unauthorized('Refresh token reused — all sessions revoked');
  }
  if (record.expires_at.getTime() < Date.now()) {
    throw ApiError.unauthorized('Refresh token expired');
  }

  const user = await findUserById(record.user_id);
  if (!user) throw ApiError.unauthorized('User not found');

  const { token: newRaw, hash: newHash } = generateRefreshToken();
  const newRecord = await insertRefreshToken({
    userId: user.id,
    tokenHash: newHash,
    expiresAt: refreshTokenExpiryDate(),
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  });
  await revokeRefreshToken(record.id, newRecord.id);

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
  });

  return { user: publicUser(user), accessToken, refreshToken: newRaw };
}

export async function logout(refreshToken?: string) {
  if (!refreshToken) return;
  const hash = hashRefreshToken(refreshToken);
  const record = await findRefreshByHash(hash);
  if (record && !record.revoked_at) await revokeRefreshToken(record.id);
}

// ---------- Helpers ----------

async function issueTokens(user: DbUser, meta: { userAgent?: string; ipAddress?: string }) {
  await updateLastLogin(user.id);

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
  });

  const { token: refreshToken, hash } = generateRefreshToken();
  await insertRefreshToken({
    userId: user.id,
    tokenHash: hash,
    expiresAt: refreshTokenExpiryDate(),
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  });

  return { user: publicUser(user), accessToken, refreshToken };
}

export function publicUser(u: DbUser) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    avatarUrl: u.avatar_url,
    notificationPrefs: u.notification_prefs,
    createdAt: u.created_at,
  };
}
