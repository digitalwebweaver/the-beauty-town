import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/config/logger';
import { isProd } from '@/config/env';

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound('Route not found'));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  let status = 500;
  let message = 'Internal server error';
  let details: unknown = undefined;

  if (err instanceof ApiError) {
    status = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    status = 400;
    message = 'Validation failed';
    details = err.flatten();
  } else if ((err as { code?: string })?.code === '23505') {
    status = 409;
    message = 'Duplicate value violates unique constraint';
  } else if ((err as { code?: string })?.code === '23P01') {
    status = 409;
    message = 'This time slot is already booked';
  } else if ((err as { code?: string })?.code === '23503') {
    status = 409;
    message = "This can't be deleted — it's still referenced elsewhere (bookings, sales, etc.)";
  } else if (err instanceof Error) {
    // Unmapped error (raw driver errors, bugs elsewhere) — don't leak
    // internal detail (column/constraint names, query fragments) to the
    // client in production. The real message still reaches the log below.
    message = isProd ? 'Internal server error' : err.message;
  }

  if (status >= 500) {
    logger.error('Unhandled error', {
      err,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.debug('Handled error', {
      status,
      message,
      path: req.path,
    });
  }

  res.status(status).json({
    success: false,
    error: {
      message,
      ...(details ? { details } : {}),
      ...(isProd ? {} : { path: req.path, method: req.method }),
    },
  });
}
