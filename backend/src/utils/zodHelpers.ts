import { z } from 'zod';

/**
 * Accepts any hex string in canonical UUID format (8-4-4-4-12).
 * Less strict than Zod's built-in .uuid() which enforces the v4/v7
 * variant bits — that rejects human-readable seed UUIDs like
 * "11111111-1111-1111-1111-111111111111". This is the correct level
 * of strictness for a Postgres UUID column.
 */
export const uuidString = () =>
  z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      'Invalid UUID format'
    );

/**
 * Accepts either:
 *   - a full absolute URL: https://example.com/foo.jpg
 *   - a server-relative path: /uploads/staff/xyz.jpg
 * This is what /uploads/* returns, so it must round-trip through the
 * "save this URL to the DB" endpoints without being rejected as a URL.
 */
export const imageRef = () =>
  z
    .string()
    .min(1)
    .max(500)
    .refine(
      (v) => v.startsWith('/') || /^https?:\/\//i.test(v),
      'Must be an https URL or a path starting with /'
    );

/**
 * Phone: exactly 10 digits. Frontend already strips non-digits.
 * Backend defends in depth — even a raw curl caller can't insert junk.
 */
export const phoneField = () => z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits');

/**
 * Human name: letters, spaces, dots, apostrophes, hyphens only.
 * Rejects "yoyo22" but accepts "Mary O'Brien" and "Jean-Pierre".
 */
export const nameField = (min = 2, max = 120) =>
  z
    .string()
    .min(min, `At least ${min} characters`)
    .max(max)
    .regex(/^[A-Za-z\s.'\-]+$/, 'Name cannot contain numbers or symbols');

/**
 * A NEW password being set (register, reset, change) — 8+ chars with at
 * least one letter and one digit. Only for endpoints that CREATE a
 * credential; login schemas must stay lenient (`z.string().min(6)`) so an
 * existing account whose password predates this rule can still sign in —
 * bcrypt.compare doesn't care how "strong" the input looks, only whether
 * it matches the stored hash.
 */
export const newPasswordField = () =>
  z
    .string()
    .min(8, 'At least 8 characters')
    .max(128)
    .regex(/[A-Za-z]/, 'Must include at least one letter')
    .regex(/[0-9]/, 'Must include at least one number');
