import type { CookieOptions, Request, Response } from 'express';
import { env, isProd } from '@/config/env';
import { ApiError } from '@/utils/ApiError';
import { ok } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { setAuditContext } from '@/utils/auditContext';
import { findUserById } from './auth.repository';
import {
  changeOwnPassword,
  confirmPasswordReset,
  loginWithGoogle,
  loginWithPassword,
  logout,
  publicUser,
  registerCustomer,
  requestLoginOtp,
  requestPasswordReset,
  rotateRefresh,
  verifyLoginOtp,
} from './auth.service';

const REFRESH_COOKIE = 'refresh_token';
const ACCESS_COOKIE = 'access_token';

function cookieBase(): CookieOptions {
  // COOKIE_SECURE env var overrides the isProd default so a prod deploy
  // over plain HTTP (before HTTPS is set up) can still authenticate —
  // Secure cookies are dropped by the browser on non-HTTPS origins.
  const secure = env.COOKIE_SECURE ?? isProd;
  return {
    httpOnly: true,
    secure,
    // `strict` requires HTTPS to be useful anyway; when we've explicitly
    // dropped Secure we're clearly not on HTTPS, so downgrade to `lax`.
    sameSite: secure ? 'strict' : 'lax',
    path: '/',
  };
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...cookieBase(),
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...cookieBase(),
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, cookieBase());
  res.clearCookie(REFRESH_COOKIE, cookieBase());
}

function meta(req: Request) {
  return {
    userAgent: req.headers['user-agent'] as string | undefined,
    ipAddress: req.ip,
  };
}

// ---------- Handlers ----------

export const requestOtp = asyncHandler(async (req, res) => {
  const { email, name } = req.body;
  const result = await requestLoginOtp(email, name, req.ip);
  res.json(ok(result));
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  setAuditContext(req, { action: 'auth.login', targetType: 'user', meta: { email, via: 'otp' } });
  const { user, accessToken, refreshToken } = await verifyLoginOtp(email, otp, meta(req));
  setAuditContext(req, { action: 'auth.login', targetType: 'user', targetId: user.id });
  setAuthCookies(res, accessToken, refreshToken);
  res.json(ok({ user, accessToken }));
});

export const requestPasswordResetHandler = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await requestPasswordReset(email, req.ip);
  res.json(ok(result));
});

export const confirmPasswordResetHandler = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  setAuditContext(req, { action: 'auth.password_reset', targetType: 'user', meta: { email } });
  await confirmPasswordReset(email, otp, newPassword);
  res.json(ok({ reset: true }));
});

export const changePasswordHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  setAuditContext(req, {
    action: 'auth.password_changed',
    targetType: 'user',
    targetId: req.user.sub,
  });
  const { currentPassword, newPassword } = req.body;
  const { user, accessToken, refreshToken } = await changeOwnPassword(
    req.user.sub,
    currentPassword,
    newPassword,
    meta(req)
  );
  setAuthCookies(res, accessToken, refreshToken);
  res.json(ok({ user, accessToken }));
});

export const passwordLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  // Set before the service call: a wrong-password throw skips the rest of
  // this handler, but the audit middleware's res.on('finish') still fires
  // on the way out with a 401 — this way that failed attempt is captured
  // with the attempted email, not silently dropped.
  setAuditContext(req, {
    action: 'auth.login',
    targetType: 'user',
    meta: { email, via: 'password' },
  });
  const { user, accessToken, refreshToken } = await loginWithPassword(email, password, meta(req));
  setAuditContext(req, { action: 'auth.login', targetType: 'user', targetId: user.id });
  setAuthCookies(res, accessToken, refreshToken);
  res.json(ok({ user, accessToken }));
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  setAuditContext(req, { action: 'auth.register', targetType: 'user', meta: { email } });
  const { user, accessToken, refreshToken } = await registerCustomer(
    { name, email, phone, password },
    meta(req)
  );
  setAuditContext(req, { action: 'auth.register', targetType: 'user', targetId: user.id });
  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json(ok({ user, accessToken }));
});

export const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  setAuditContext(req, { action: 'auth.login', targetType: 'user', meta: { via: 'google' } });
  const { user, accessToken, refreshToken } = await loginWithGoogle(idToken, meta(req));
  setAuditContext(req, {
    action: 'auth.login',
    targetType: 'user',
    targetId: user.id,
    meta: { email: user.email },
  });
  setAuthCookies(res, accessToken, refreshToken);
  res.json(ok({ user, accessToken }));
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) throw ApiError.unauthorized('Missing refresh token');
  const { user, accessToken, refreshToken } = await rotateRefresh(token, meta(req));
  setAuthCookies(res, accessToken, refreshToken);
  res.json(ok({ user, accessToken }));
});

export const logoutHandler = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  setAuditContext(req, {
    action: 'auth.logout',
    targetType: 'user',
    targetId: req.user?.sub ?? null,
  });
  await logout(token);
  clearAuthCookies(res);
  res.json(ok({ message: 'Logged out' }));
});

export const me = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const user = await findUserById(req.user.sub);
  if (!user) throw ApiError.notFound('User not found');
  res.json(ok({ user: publicUser(user) }));
});

// keep env-referenced (avoid TS unused import warning)
void env;
