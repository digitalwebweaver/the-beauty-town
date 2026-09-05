import { query, withTransaction } from '@/config/db';
import type { PoolClient } from 'pg';

export interface DbUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'customer' | 'staff' | 'admin';
  password_hash: string | null;
  avatar_url: string | null;
  notification_prefs: {
    appointmentReminders: boolean;
    promotionalOffers: boolean;
    newsletter: boolean;
  };
  is_active: boolean;
  email_verified: boolean;
  failed_login_attempts: number;
  locked_until: Date | null;
  last_login_at: Date | null;
  created_at: Date;
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const { rows } = await query<DbUser>(
    `SELECT * FROM users WHERE email_lower = LOWER($1) LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const { rows } = await query<DbUser>(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ?? null;
}

export async function createCustomer(input: {
  name: string;
  email: string;
  phone?: string;
  emailVerified?: boolean;
  avatarUrl?: string;
  passwordHash?: string;
}): Promise<DbUser> {
  const { rows } = await query<DbUser>(
    `INSERT INTO users (name, email, phone, role, email_verified, avatar_url, password_hash)
     VALUES ($1, $2, $3, 'customer', $4, $5, $6)
     RETURNING *`,
    [
      input.name,
      input.email,
      input.phone ?? null,
      input.emailVerified ?? false,
      input.avatarUrl ?? null,
      input.passwordHash ?? null,
    ]
  );
  return rows[0];
}

export async function upsertGoogleCustomer(input: {
  email: string;
  name: string;
  googleId: string;
  avatarUrl?: string;
}): Promise<DbUser> {
  return withTransaction(async (client) => {
    const existing = await client.query<DbUser>(
      `SELECT * FROM users WHERE email_lower = LOWER($1) LIMIT 1`,
      [input.email]
    );

    let user = existing.rows[0];
    if (!user) {
      const created = await client.query<DbUser>(
        `INSERT INTO users (name, email, role, email_verified, avatar_url)
         VALUES ($1, $2, 'customer', TRUE, $3)
         RETURNING *`,
        [input.name, input.email, input.avatarUrl ?? null]
      );
      user = created.rows[0];
    } else if (!user.email_verified || !user.avatar_url) {
      const updated = await client.query<DbUser>(
        `UPDATE users
         SET email_verified = TRUE,
             avatar_url = COALESCE(avatar_url, $2)
         WHERE id = $1
         RETURNING *`,
        [user.id, input.avatarUrl ?? null]
      );
      user = updated.rows[0];
    }

    await client.query(
      `INSERT INTO oauth_accounts (user_id, provider, provider_user_id, email)
       VALUES ($1, 'google', $2, $3)
       ON CONFLICT (provider, provider_user_id) DO NOTHING`,
      [user.id, input.googleId, input.email]
    );

    return user;
  });
}

export async function markEmailVerified(userId: string): Promise<void> {
  await query(`UPDATE users SET email_verified = TRUE WHERE id = $1`, [userId]);
}

export async function updateLastLogin(userId: string): Promise<void> {
  await query(
    `UPDATE users
     SET last_login_at = NOW(), failed_login_attempts = 0, locked_until = NULL
     WHERE id = $1`,
    [userId]
  );
}

export async function incrementFailedLogin(userId: string): Promise<DbUser> {
  const { rows } = await query<DbUser>(
    `UPDATE users
     SET failed_login_attempts = failed_login_attempts + 1,
         locked_until = CASE
           WHEN failed_login_attempts + 1 >= 10 THEN NOW() + INTERVAL '30 minutes'
           ELSE locked_until
         END
     WHERE id = $1
     RETURNING *`,
    [userId]
  );
  return rows[0];
}

// ---------- OTP ----------
export async function createOtp(input: {
  email: string;
  otpHash: string;
  expiresAt: Date;
  ipAddress?: string;
  purpose?: string;
}): Promise<void> {
  await query(
    `INSERT INTO otp_tokens (email, purpose, otp_hash, expires_at, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.email, input.purpose ?? 'login', input.otpHash, input.expiresAt, input.ipAddress ?? null]
  );
}

export interface DbOtp {
  id: string;
  email: string;
  otp_hash: string;
  expires_at: Date;
  used_at: Date | null;
  attempts: number;
}

export async function findLatestActiveOtp(
  email: string,
  purpose: string = 'login'
): Promise<DbOtp | null> {
  const { rows } = await query<DbOtp>(
    `SELECT id, email, otp_hash, expires_at, used_at, attempts
     FROM otp_tokens
     WHERE LOWER(email) = LOWER($1)
       AND purpose = $2
       AND used_at IS NULL
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [email, purpose]
  );
  return rows[0] ?? null;
}

export async function updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
  await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, userId]);
}

export async function incrementOtpAttempts(id: string): Promise<void> {
  await query(`UPDATE otp_tokens SET attempts = attempts + 1 WHERE id = $1`, [id]);
}

export async function markOtpUsed(id: string): Promise<void> {
  await query(`UPDATE otp_tokens SET used_at = NOW() WHERE id = $1`, [id]);
}

// ---------- Refresh tokens ----------
export async function insertRefreshToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  client?: PoolClient;
}): Promise<{ id: string }> {
  const sql = `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`;
  const params = [
    input.userId,
    input.tokenHash,
    input.expiresAt,
    input.userAgent ?? null,
    input.ipAddress ?? null,
  ];
  const res = input.client
    ? await input.client.query<{ id: string }>(sql, params)
    : await query<{ id: string }>(sql, params);
  return res.rows[0];
}

export interface DbRefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
}

export async function findRefreshByHash(hash: string): Promise<DbRefreshToken | null> {
  const { rows } = await query<DbRefreshToken>(
    `SELECT id, user_id, token_hash, expires_at, revoked_at
     FROM refresh_tokens
     WHERE token_hash = $1 LIMIT 1`,
    [hash]
  );
  return rows[0] ?? null;
}

export async function revokeRefreshToken(id: string, replacedBy?: string): Promise<void> {
  await query(`UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by = $2 WHERE id = $1`, [
    id,
    replacedBy ?? null,
  ]);
}

export async function revokeAllRefreshForUser(userId: string): Promise<void> {
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}
