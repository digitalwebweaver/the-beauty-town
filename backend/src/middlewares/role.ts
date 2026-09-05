import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '@/utils/ApiError';

type Role = 'customer' | 'staff' | 'admin';

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden('Insufficient role'));
    next();
  };
}
