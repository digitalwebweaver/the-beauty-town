export type UserRole = 'customer' | 'staff' | 'admin';

export interface NotificationPrefs {
  appointmentReminders: boolean;
  promotionalOffers: boolean;
  newsletter: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  notificationPrefs?: NotificationPrefs;
  createdAt: string;
}

export type ServiceCategory = 'hair' | 'skin' | 'nails' | 'makeup' | 'spa' | 'grooming';

export interface Service {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  gender: 'male' | 'female' | 'unisex';
  priceInr: number;
  durationMinutes: number;
  imageUrl?: string;
  isActive: boolean;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  bio: string;
  specialties: ServiceCategory[];
  avatarUrl?: string;
  rating: number;
  experienceYears: number;
  isActive: boolean;
}

export type AppointmentStatus =
  'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  staffId: string;
  staffName: string;
  serviceIds: string[];
  serviceNames: string[];
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  totalInr: number;
  notes?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  stock: number;
  priceInr: number;
  reorderLevel: number;
}

export interface Review {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  staffId?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export type PaymentMethod = 'cash' | 'card' | 'upi';

export type SaleItemType = 'service' | 'product';

export interface SaleLineItem {
  id: string;
  itemType: SaleItemType;
  name: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  lineTotal: number;
}

export interface SalePayment {
  method: PaymentMethod;
  amount: number;
}

export type SaleStatus = 'completed' | 'void';

export interface Sale {
  id: string;
  appointmentId?: string | null;
  customerId?: string | null;
  customerName: string | null;
  customerPhone: string | null;
  staffId: string | null;
  staffName: string | null;
  subtotalInr: number;
  discountInr: number;
  totalInr: number;
  status: SaleStatus;
  notes?: string | null;
  createdAt: string;
  items: SaleLineItem[];
  payments: SalePayment[];
}

export interface DashboardStat {
  label: string;
  value: string;
  delta?: string;
  trend?: 'up' | 'down' | 'flat';
  icon?: string;
}
