import type { NextFunction, Request, Response } from 'express';
import { recordAudit } from './audit.service';

// The health check fires constantly (Docker's own healthcheck polls it,
// and it's a GET anyway) — no other exclusions needed since GETs are
// already skipped wholesale below.
const EXCLUDED_PATHS = new Set(['/api/health']);

/**
 * Generic HTTP-layer audit capture, mounted once in app.ts before any
 * route — logs every non-GET /api request after it completes
 * (`res.on('finish')`, so the real status code + duration are known).
 * Requires no change to any existing controller: a handler can optionally
 * call `setAuditContext(req, {...})` beforehand to get a human-readable
 * action/target/meta instead of the generic method+path fallback — see
 * `@/utils/auditContext`.
 *
 * GETs are deliberately excluded — reads are noise for an audit trail
 * (dashboards and the notification bell poll constantly) and would
 * multiply write volume for no "who changed what" signal.
 */
export function auditCapture(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  if (EXCLUDED_PATHS.has(req.path)) return next();

  const start = Date.now();

  res.on('finish', () => {
    const ctx = req.auditContext;

    // Fallback label built from the matched route's own PARAMETERIZED
    // pattern (e.g. "/:id/status"), not the resolved path with a real
    // uuid in it — keeps the `action` column's cardinality low so it
    // stays useful for grouping/filtering. `req.route` is only populated
    // once a route actually matched; falls back to the raw path for a
    // 404 on a mutating request (still worth a row — an attempted write
    // to a nonexistent endpoint is real signal).
    const routePattern = req.route?.path ? String(req.route.path) : req.path;
    const moduleName = req.baseUrl.replace(/^\/api\/?/, '') || 'root';
    const fallbackAction = `${moduleName}:${req.method} ${routePattern}`;

    void recordAudit({
      actorId: req.user?.sub ?? null,
      actorEmail: req.user?.email ?? null,
      actorRole: req.user?.role ?? null,
      action: ctx?.action ?? fallbackAction,
      targetType: ctx?.targetType ?? null,
      targetId: ctx?.targetId ?? (req.params?.id as string | undefined) ?? null,
      meta: ctx?.meta ?? null,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  });

  next();
}
