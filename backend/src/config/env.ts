import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  // No default on purpose — a forgotten prod env var must fail loudly at
  // boot, not silently CORS-block the real frontend while quietly still
  // pointing at localhost.
  CLIENT_URL: z.string().url(),

  PGHOST: z.string().default('localhost'),
  PGPORT: z.coerce.number().default(5432),
  PGUSER: z.string().default('postgres'),
  PGPASSWORD: z.string(),
  PGDATABASE: z.string().default('salon_db'),

  ACCESS_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('30d'),

  OTP_LENGTH: z.coerce.number().default(6),
  OTP_TTL_MINUTES: z.coerce.number().default(5),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:5000/api/auth/google/callback'),

  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default('The Beauty Town <no-reply@thebeautytown.in>'),

  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_MB: z.coerce.number().default(5),

  // Web Push — optional, same graceful-noop pattern as SMTP_*: unset in a
  // given environment simply means push sends are silently skipped rather
  // than the app failing to boot.
  VAPID_PUBLIC_KEY: z.string().optional().default(''),
  VAPID_PRIVATE_KEY: z.string().optional().default(''),
  VAPID_SUBJECT: z.string().optional().default('mailto:admin@example.com'),

  // Whether to set the `Secure` flag on auth cookies. Defaults to true in
  // production (correct for HTTPS), but must be explicitly set to `false`
  // when deploying prod over plain HTTP — otherwise browsers silently drop
  // the cookie and every request looks unauthenticated.
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';

// Guard against ever actually deploying the scaffold's placeholder JWT
// secrets (or an equally weak hand-typed replacement) to production. A
// secret merely being 32+ chars (the zod check above) doesn't mean it's
// actually random — this catches both the known placeholder text and any
// other low-entropy string via a Shannon-entropy check.
const PLACEHOLDER_SECRET_PATTERNS = [/^change_?me/i, /^replace_?me/i, /^your_/i, /^secret$/i];

function shannonEntropyBitsPerChar(s: string): number {
  const freq = new Map<string, number>();
  for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / s.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

if (isProd) {
  for (const [name, value] of [
    ['ACCESS_TOKEN_SECRET', env.ACCESS_TOKEN_SECRET],
    ['REFRESH_TOKEN_SECRET', env.REFRESH_TOKEN_SECRET],
  ] as const) {
    const looksPlaceholder = PLACEHOLDER_SECRET_PATTERNS.some((p) => p.test(value));
    const lowEntropy = shannonEntropyBitsPerChar(value) < 3.0;
    if (looksPlaceholder || lowEntropy) {
      console.error(
        `❌ ${name} looks like a placeholder or low-entropy value — refusing to start in production. ` +
          'Generate a real secret, e.g. `openssl rand -hex 32`, and set it before deploying.'
      );
      process.exit(1);
    }
  }
}
