import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

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

export interface PaginatedAuditLogs {
  data: AuditLogRow[];
  page: number;
  pageSize: number;
  total: number;
}

export function useAuditLogs(filters: {
  actorId?: string;
  action?: string;
  targetType?: string;
  from?: string;
  to?: string;
  q?: string;
  page: number;
  pageSize: number;
}) {
  return useQuery({
    queryKey: ['audit', 'list', filters],
    queryFn: async () => {
      const { data } = await api.get('/audit', { params: filters });
      return data as PaginatedAuditLogs;
    },
    placeholderData: (prev) => prev,
  });
}

export interface AuditStats {
  dailyActivity: { day: string; count: number }[];
  topActors: { actorName: string | null; actorEmail: string | null; count: number }[];
  topActions: { action: string; count: number }[];
  loginSuccessCount: number;
  loginFailureCount: number;
  activeSessionCount: number;
}

export function useAuditStats(days = 30) {
  return useQuery({
    queryKey: ['audit', 'stats', days],
    queryFn: async () =>
      (await api.get('/audit/stats', { params: { days } })).data.data as AuditStats,
  });
}
