import { query } from '@/config/db';
import { logger } from '@/config/logger';

export interface RecordAuditInput {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  meta?: Record<string, unknown> | null;
  method?: string | null;
  path?: string | null;
  statusCode?: number | null;
  durationMs?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Fire-and-forget from every call site (the HTTP-capture middleware, and
 * anywhere that wants to log outside the request/response cycle) — an
 * audit-write failure must never fail or slow down the real action, same
 * convention as `notifyNewAppointment(...).catch(() => {})` elsewhere in
 * this codebase. Errors are logged, not silently swallowed.
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs (
         actor_id, actor_email, actor_role, action, target_type, target_id, meta,
         method, path, status_code, duration_ms, ip_address, user_agent
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        input.actorId ?? null,
        input.actorEmail ?? null,
        input.actorRole ?? null,
        input.action,
        input.targetType ?? null,
        input.targetId ?? null,
        input.meta ? JSON.stringify(input.meta) : null,
        input.method ?? null,
        input.path ?? null,
        input.statusCode ?? null,
        input.durationMs ?? null,
        input.ipAddress ?? null,
        input.userAgent ?? null,
      ]
    );
  } catch (err) {
    logger.error('Failed to record audit log entry', {
      action: input.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  meta: Record<string, unknown> | null;
  method: string | null;
  path: string | null;
  status_code: number | null;
  duration_ms: number | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ListAuditLogsFilters {
  actorId?: string;
  action?: string;
  targetType?: string;
  from?: string;
  to?: string;
  q?: string;
  page: number;
  pageSize: number;
}

export async function listAuditLogs(
  filters: ListAuditLogsFilters
): Promise<{ rows: AuditLogRow[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.actorId) {
    params.push(filters.actorId);
    where.push(`al.actor_id = $${params.length}`);
  }
  if (filters.action) {
    params.push(`${filters.action}%`);
    where.push(`al.action LIKE $${params.length}`);
  }
  if (filters.targetType) {
    params.push(filters.targetType);
    where.push(`al.target_type = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    where.push(`al.created_at::date >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    where.push(`al.created_at::date <= $${params.length}`);
  }
  if (filters.q) {
    params.push(`%${filters.q}%`);
    const p = `$${params.length}`;
    where.push(
      `(al.action ILIKE ${p} OR al.actor_email ILIKE ${p} OR al.path ILIKE ${p} OR u.name ILIKE ${p})`
    );
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRes = await query<{ count: string }>(
    `SELECT COUNT(*) FROM audit_logs al LEFT JOIN users u ON u.id = al.actor_id ${clause}`,
    params
  );
  const total = Number(countRes.rows[0].count);

  const limitParam = params.length + 1;
  const offsetParam = params.length + 2;
  const { rows } = await query<AuditLogRow>(
    `SELECT al.id, al.actor_id, u.name AS actor_name, al.actor_email, al.actor_role,
            al.action, al.target_type, al.target_id, al.meta,
            al.method, al.path, al.status_code, al.duration_ms,
            al.ip_address, al.user_agent, al.created_at
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_id
     ${clause}
     ORDER BY al.created_at DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    [...params, filters.pageSize, (filters.page - 1) * filters.pageSize]
  );
  return { rows, total };
}

export interface AuditStats {
  dailyActivity: { day: string; count: number }[];
  topActors: { actorName: string | null; actorEmail: string | null; count: number }[];
  topActions: { action: string; count: number }[];
  loginSuccessCount: number;
  loginFailureCount: number;
  activeSessionCount: number;
}

export async function getAuditStats(days: number): Promise<AuditStats> {
  const sinceISO = new Date(Date.now() - days * 86_400_000).toISOString();

  const [dailyRes, actorsRes, actionsRes, loginRes, sessionsRes] = await Promise.all([
    query<{ day: string; count: string }>(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*) AS count
       FROM audit_logs
       WHERE created_at >= $1
       GROUP BY 1 ORDER BY 1`,
      [sinceISO]
    ),
    query<{ actor_name: string | null; actor_email: string | null; count: string }>(
      `SELECT u.name AS actor_name, al.actor_email, COUNT(*) AS count
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_id
       WHERE al.created_at >= $1 AND al.actor_id IS NOT NULL
       GROUP BY u.name, al.actor_email
       ORDER BY count DESC
       LIMIT 5`,
      [sinceISO]
    ),
    query<{ action: string; count: string }>(
      `SELECT action, COUNT(*) AS count
       FROM audit_logs
       WHERE created_at >= $1
       GROUP BY action
       ORDER BY count DESC
       LIMIT 8`,
      [sinceISO]
    ),
    query<{ success_count: string; failure_count: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE status_code < 400) AS success_count,
         COUNT(*) FILTER (WHERE status_code >= 400) AS failure_count
       FROM audit_logs
       WHERE created_at >= $1 AND action = 'auth.login'`,
      [sinceISO]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM refresh_tokens WHERE revoked_at IS NULL AND expires_at > NOW()`
    ),
  ]);

  // Gapless daily series so the chart doesn't skip quiet days.
  const byDay = new Map(dailyRes.rows.map((r) => [r.day, Number(r.count)]));
  const dailyActivity: { day: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    dailyActivity.push({ day: d, count: byDay.get(d) ?? 0 });
  }

  return {
    dailyActivity,
    topActors: actorsRes.rows.map((r) => ({
      actorName: r.actor_name,
      actorEmail: r.actor_email,
      count: Number(r.count),
    })),
    topActions: actionsRes.rows.map((r) => ({ action: r.action, count: Number(r.count) })),
    loginSuccessCount: Number(loginRes.rows[0]?.success_count ?? 0),
    loginFailureCount: Number(loginRes.rows[0]?.failure_count ?? 0),
    activeSessionCount: Number(sessionsRes.rows[0]?.count ?? 0),
  };
}
