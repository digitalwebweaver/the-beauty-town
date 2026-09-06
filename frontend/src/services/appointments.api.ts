import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export type AppointmentStatus =
  'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface AppointmentListItem {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  total_inr: string;
  customer_name?: string;
  customer_phone?: string;
  staff_name?: string | null;
  service_names: string[];
  notes?: string | null;
}

export function useMyAppointments(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['appointments', 'mine'],
    queryFn: async () => (await api.get('/appointments/mine')).data.data as AppointmentListItem[],
    enabled: opts?.enabled ?? true,
  });
}

// Unpaginated by default — several widget-style callers (today's board,
// this week's schedule, a staff dashboard's counts) intentionally want
// EVERY row matching an already-narrow filter with no pagination UI of
// their own. Omitting page/pageSize puts the backend in its "give me
// everything matching this filter" mode (see appointments.validator.ts) —
// use useAllAppointmentsPaged for a real admin/staff table instead.
export function useAllAppointments(filters?: {
  status?: string;
  from?: string;
  to?: string;
  q?: string;
  enabled?: boolean;
}) {
  const { enabled, ...params } = filters ?? {};
  return useQuery({
    queryKey: ['appointments', 'all', params],
    queryFn: async () => {
      const { data } = await api.get('/appointments', { params });
      return data.data as AppointmentListItem[];
    },
    enabled: enabled ?? true,
  });
}

export interface PaginatedAppointments {
  data: AppointmentListItem[];
  page: number;
  pageSize: number;
  total: number;
}

// Genuinely paginated + server-side searched — for admin/staff tables that
// browse a potentially large, loosely-filtered result set. `status` accepts
// several values at once (e.g. an "upcoming" tab meaning
// pending+confirmed+in_progress) — built as a hand-rolled URLSearchParams
// with one repeated `status=` key per value, same reasoning as
// useSlotAvailability's serviceIds: axios's default array serializer
// brackets it as `status[]=`, which Express's plain querystring parser
// won't recognize as an array.
export function useAllAppointmentsPaged(filters: {
  status?: string | string[];
  from?: string;
  to?: string;
  q?: string;
  staffId?: string;
  page: number;
  pageSize: number;
  enabled?: boolean;
}) {
  const { enabled, ...params } = filters;
  return useQuery({
    queryKey: ['appointments', 'all', 'paged', params],
    queryFn: async () => {
      const query = new URLSearchParams();
      const statuses = params.status
        ? Array.isArray(params.status)
          ? params.status
          : [params.status]
        : [];
      statuses.forEach((s) => query.append('status', s));
      if (params.from) query.set('from', params.from);
      if (params.to) query.set('to', params.to);
      if (params.q) query.set('q', params.q);
      if (params.staffId) query.set('staffId', params.staffId);
      query.set('page', String(params.page));
      query.set('pageSize', String(params.pageSize));
      const { data } = await api.get('/appointments', { params: query });
      return data as PaginatedAppointments;
    },
    enabled: enabled ?? true,
    placeholderData: (prev) => prev,
  });
}

export interface CreateAppointmentInput {
  staffId?: string | null;
  appointmentDate: string;
  startTime: string;
  serviceIds: string[];
  packageId?: string;
  notes?: string;
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateAppointmentInput) =>
      (await api.post('/appointments', body)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}

export interface GuestBookingInput {
  name: string;
  phone: string;
  email?: string;
  staffId?: string | null;
  appointmentDate: string;
  startTime: string;
  serviceIds: string[];
  packageId?: string;
  notes?: string;
}

export function useCreateGuestAppointment() {
  return useMutation({
    mutationFn: async (body: GuestBookingInput) =>
      (await api.post('/appointments/guest', body)).data.data,
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) =>
      (await api.patch(`/appointments/${id}/cancel`, { reason })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) =>
      (await api.patch(`/appointments/${id}/status`, { status })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}

export function useTransferAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, newStaffId }: { id: string; newStaffId: string }) =>
      (await api.patch(`/appointments/${id}/transfer`, { newStaffId })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}

export interface AppointmentDetail {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string | null;
  staff_id: string | null;
  staff_name: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  total_inr: string;
  notes: string | null;
  package_id: string | null;
  package_name: string | null;
  created_at: string;
  services: { id: string; name: string; price: string; durationMinutes: number }[];
}

export function useAppointmentDetail(id: string | null) {
  return useQuery({
    enabled: !!id,
    queryKey: ['appointments', 'detail', id],
    queryFn: async () => (await api.get(`/appointments/${id}`)).data.data as AppointmentDetail,
  });
}

export function useSlotAvailability(params: {
  date?: string;
  durationMinutes?: number;
  staffId?: string | null;
  serviceIds?: string[];
}) {
  const { date, durationMinutes, staffId, serviceIds } = params;
  const enabled = !!date && !!durationMinutes && durationMinutes > 0;
  return useQuery({
    enabled,
    queryKey: ['availability', date, staffId ?? 'any', durationMinutes, serviceIds ?? []],
    queryFn: async () => {
      // Built by hand (not axios's object-param serializer, which brackets
      // arrays as `serviceIds[]=`) because the backend's query parser is
      // Express 5's plain `querystring` parser — it only turns a REPEATED
      // bare key (`serviceIds=a&serviceIds=b`) into an array; `[]` keys
      // come through as a literal, unrecognized field name and get dropped.
      const query = new URLSearchParams();
      if (date) query.set('date', date);
      if (durationMinutes) query.set('duration', String(durationMinutes));
      if (staffId && staffId !== 'any') query.set('staffId', staffId);
      serviceIds?.forEach((id) => query.append('serviceIds', id));
      const { data } = await api.get('/appointments/availability', {
        params: query,
      });
      return data.data as {
        staffId: string | null;
        date: string;
        busy: string[];
      };
    },
  });
}
