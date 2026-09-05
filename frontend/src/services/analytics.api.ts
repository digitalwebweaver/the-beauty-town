import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

export type DashboardRange = 7 | 30 | 90 | 365;

export interface DashboardSummary {
  revenueInr: number;
  revenueChangePct: number | null;
  salesCount: number;
  avgTicketInr: number;
  totalAppointments: number;
  completedAppointments: number;
  noShowRatePct: number;
  newCustomers: number;
  returningCustomers: number;
  couponRedemptions: number;
  couponDiscountInr: number;
  lifetimeRevenueInr: number;
  totalCustomers: number;
  activeStaffCount: number;
  appointmentsToday: number;
  lowStockCount: number;
}

export interface DashboardAnalyticsDto {
  range: { days: number; since: string };
  summary: DashboardSummary;
  revenueSeries: { date: string; revenueInr: number; salesCount: number }[];
  appointmentStatusBreakdown: { status: string; count: number }[];
  paymentMethodBreakdown: { method: string; amountInr: number; count: number }[];
  topServices: { name: string; qty: number; revenueInr: number }[];
  topProducts: { name: string; qty: number; revenueInr: number }[];
  categoryRevenue: { label: string; revenueInr: number }[];
  staffPerformance: {
    id: string;
    name: string;
    avatarUrl: string | null;
    roleTitle: string;
    rating: number;
    revenueInr: number;
    salesCount: number;
    appointmentsCount: number;
  }[];
  peakHours: { hour: number; count: number }[];
  bookingsByDay: { day: string; count: number }[];
  lowStockProducts: { id: string; name: string; stock: number; reorderLevel: number }[];
  couponPerformance: { code: string; redemptions: number; discountInr: number }[];
  reviews: { avgRating: number; count: number; breakdown: { stars: number; count: number }[] };
}

const KEY = ['analytics', 'dashboard'];

export function useDashboardAnalytics(range: DashboardRange) {
  return useQuery({
    queryKey: [...KEY, range],
    queryFn: async () =>
      (await api.get('/analytics/dashboard', { params: { range } })).data
        .data as DashboardAnalyticsDto,
    placeholderData: (prev) => prev,
  });
}
