import type { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodType, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) return next(parsed.error);
    // Express 5 defines `req.query` as a getter with no setter (it's
    // recomputed from req.url on every access), so a plain assignment
    // here silently no-ops — the coerced/transformed data (e.g. a
    // wrapped-into-array field) would never actually reach the route
    // handler. Redefining the property replaces the getter outright.
    Object.defineProperty(req, source, {
      value: parsed.data,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    next();
  };
}
