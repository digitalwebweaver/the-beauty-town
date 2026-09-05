import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '@/utils/ApiError';
import { verifyAccessToken } from '@/utils/jwt';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearer || (req.cookies?.access_token as string | undefined);

  if (!token) return next(ApiError.unauthorized('Missing access token'));

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired access token'));
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearer || (req.cookies?.access_token as string | undefined);
  if (!token) return next();
  try {
    req.user = verifyAccessToken(token);
  } catch {
    /* ignore */
  }
  next();
}
