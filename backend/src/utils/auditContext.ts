import type { Request } from 'express';

export interface AuditContext {
  /** Short, dot-namespaced label, e.g. "auth.login", "appointments.status_changed". */
  action: string;
  targetType?: string;
  targetId?: string | null;
  /**
   * Deliberately-chosen safe fields only — NEVER pass `req.body` through
   * wholesale (auth routes carry passwords). Pick exact fields, e.g.
   * `{ fromStatus, toStatus }`.
   */
  meta?: Record<string, unknown>;
}

/**
 * Lets a controller attach a human-readable description of what it's
 * doing, read later by the generic audit-capture middleware's
 * `res.on('finish')` handler (see `audit.middleware.ts`) once the request
 * completes and the status code is known. Safe to call more than once —
 * a later call (e.g. once a login succeeds and the real user id is known)
 * merges over an earlier one (e.g. the attempted email, set before the
 * password check ran) rather than replacing it outright, so a call that
 * only wants to add `targetId` doesn't have to repeat `meta`.
 */
export function setAuditContext(req: Request, ctx: AuditContext): void {
  req.auditContext = {
    ...req.auditContext,
    ...ctx,
    meta: { ...req.auditContext?.meta, ...ctx.meta },
  };
}
