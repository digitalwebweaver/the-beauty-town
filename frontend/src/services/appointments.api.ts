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

export function useMyAppointments() {
  return useQuery({
    queryKey: ['appointments', 'mine'],
    queryFn: async () => (await api.get('/appointments/mine')).data.data as AppointmentListItem[],
  });
}

export function useAllAppointments(filters?: {
  status?: string;
  from?: string;
  to?: string;
  q?: string;
}) {
  return useQuery({
    queryKey: ['appointments', 'all', filters ?? {}],
    queryFn: async () => {
      const { data } = await api.get('/appointments', { params: filters });
      return data.data as AppointmentListItem[];
    },
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
