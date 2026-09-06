import rateLimit from 'express-rate-limit';

/**
 * Global limiter: 300 req / 15 min / IP. Protects entire API.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests' } },
});

/**
 * Login limiter: 10 attempts / 15 min / IP.
 * DB-level lockout after 10 failed attempts is enforced in auth.service too.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: { message: 'Too many login attempts. Try again in 15 minutes.' },
  },
});

/**
 * OTP request limiter: 3 requests / 15 min / IP.
 * Prevents email flooding.
 */
export const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many OTP requests. Try again in 15 minutes.' },
  },
});

/**
 * OTP verify limiter: 10 attempts / 15 min / IP.
 */
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many OTP verify attempts.' },
  },
});

/**
 * Public contact-form limiter: 5 submissions / 15 min / IP. It's an
 * unauthenticated form that sends an email on every hit — the obvious
 * abuse vector to cap.
 */
export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many messages sent. Try again later.' },
  },
});

/**
 * Guest booking limiter: 8 bookings / 15 min / IP. Fully unauthenticated
 * and writes to the DB (creates a customer + an appointment) on every
 * hit — without this it only inherited the 300/15min global limit, cheap
 * enough to flood a staff member's whole day with junk bookings.
 */
export const guestBookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many booking attempts. Try again later.' },
  },
});

/**
 * Report generation limiter: 20 / 15 min / IP. Rendering a PDF (several
 * aggregation queries + laying out a document) is meaningfully heavier
 * than a typical JSON response — this is admin-only already, so the cap
 * just guards against an accidental tight retry loop, not real abuse.
 */
export const reportGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many report requests. Try again in a few minutes.' },
  },
});
