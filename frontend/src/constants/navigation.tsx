import {
  CalendarCheck,
  CalendarDays,
  CalendarOff,
  Gift,
  History,
  Home,
  LayoutDashboard,
  Package,
  Receipt,
  ScissorsSquare,
  Settings,
  Sparkles,
  Tag,
  UserCircle,
  UserCog,
  Users,
} from 'lucide-react';
import { ROUTES } from './routes';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CUSTOMER_NAV: NavItem[] = [
  { label: 'Overview', href: ROUTES.customerDashboard, icon: LayoutDashboard },
  { label: 'Book Appointment', href: ROUTES.book, icon: Sparkles },
  { label: 'My Appointments', href: ROUTES.myAppointments, icon: CalendarCheck },
  { label: 'Profile', href: ROUTES.profile, icon: UserCircle },
];

export const ADMIN_NAV: NavItem[] = [
  { label: 'Overview', href: ROUTES.admin, icon: LayoutDashboard },
  { label: 'Book Appointment', href: ROUTES.adminBook, icon: Sparkles },
  { label: 'Quick Bill', href: ROUTES.adminBilling, icon: Receipt },
  { label: 'Sales', href: ROUTES.adminSales, icon: History },
  { label: 'Appointments', href: ROUTES.adminAppointments, icon: CalendarCheck },
  { label: 'Services', href: ROUTES.adminServices, icon: ScissorsSquare },
  { label: 'Packages', href: ROUTES.adminPackages, icon: Gift },
  { label: 'Holidays', href: ROUTES.adminHolidays, icon: CalendarOff },
  { label: 'Staff', href: ROUTES.adminStaff, icon: Users },
  { label: 'Customers', href: ROUTES.adminCustomers, icon: UserCircle },
  { label: 'Inventory', href: ROUTES.adminInventory, icon: Package },
  { label: 'Coupons', href: ROUTES.adminCoupons, icon: Tag },
  { label: 'Settings', href: ROUTES.adminSettings, icon: Settings },
  { label: 'Profile', href: ROUTES.adminProfile, icon: UserCog },
];

export const STAFF_NAV: NavItem[] = [
  { label: 'Overview', href: ROUTES.staff, icon: LayoutDashboard },
  { label: 'Book Appointment', href: ROUTES.staffBook, icon: Sparkles },
  { label: 'Quick Bill', href: ROUTES.staffBilling, icon: Receipt },
  { label: 'Sales', href: ROUTES.staffSales, icon: History },
  { label: 'My Schedule', href: ROUTES.staffSchedule, icon: CalendarDays },
  { label: 'Appointments', href: ROUTES.staffAppointments, icon: CalendarCheck },
  { label: 'Profile', href: ROUTES.staffProfile, icon: UserCog },
];

export const PUBLIC_NAV: NavItem[] = [
  { label: 'Home', href: ROUTES.home, icon: Home },
  { label: 'Services', href: ROUTES.services, icon: Sparkles },
  { label: 'Packages', href: ROUTES.packages, icon: Gift },
  { label: 'About', href: ROUTES.about, icon: UserCircle },
  { label: 'Gallery', href: ROUTES.gallery, icon: Package },
  { label: 'Contact', href: ROUTES.contact, icon: Settings },
];
