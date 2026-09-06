import {
  CalendarCheck,
  CalendarDays,
  CalendarOff,
  FileBarChart,
  Gift,
  History,
  Home,
  LayoutDashboard,
  Package,
  Receipt,
  ScissorsSquare,
  ScrollText,
  Settings,
  Sparkles,
  Tag,
  Tags,
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

/** A collapsible sidebar section bundling related links under one heading. */
export interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry;
}

export const CUSTOMER_NAV: NavItem[] = [
  { label: 'Overview', href: ROUTES.customerDashboard, icon: LayoutDashboard },
  { label: 'Book Appointment', href: ROUTES.book, icon: Sparkles },
  { label: 'My Appointments', href: ROUTES.myAppointments, icon: CalendarCheck },
  { label: 'Profile', href: ROUTES.profile, icon: UserCircle },
];

// The desktop sidebar's grouped structure — the 4 items used daily
// (Overview, Appointments, Quick Bill, Sales) stay top-level for one-click
// access; everything else folds into a themed, collapsible group so the
// sidebar reads as ~10 rows instead of 14.
export const ADMIN_SECTIONS: NavEntry[] = [
  { label: 'Overview', href: ROUTES.admin, icon: LayoutDashboard },
  { label: 'Appointments', href: ROUTES.adminAppointments, icon: CalendarCheck },
  { label: 'Quick Bill', href: ROUTES.adminBilling, icon: Receipt },
  { label: 'Sales', href: ROUTES.adminSales, icon: History },
  {
    label: 'Bookings',
    icon: CalendarDays,
    items: [
      { label: 'Book Appointment', href: ROUTES.adminBook, icon: Sparkles },
      { label: 'Holidays', href: ROUTES.adminHolidays, icon: CalendarOff },
    ],
  },
  {
    label: 'Catalog',
    icon: Package,
    items: [
      { label: 'Services', href: ROUTES.adminServices, icon: ScissorsSquare },
      { label: 'Categories', href: ROUTES.adminCategories, icon: Tags },
      { label: 'Packages', href: ROUTES.adminPackages, icon: Gift },
      { label: 'Inventory', href: ROUTES.adminInventory, icon: Package },
    ],
  },
  {
    label: 'People',
    icon: Users,
    items: [
      { label: 'Staff', href: ROUTES.adminStaff, icon: Users },
      { label: 'Customers', href: ROUTES.adminCustomers, icon: UserCircle },
    ],
  },
  { label: 'Coupons', href: ROUTES.adminCoupons, icon: Tag },
  { label: 'Reports', href: ROUTES.adminReports, icon: FileBarChart },
  { label: 'Audit Trail', href: ROUTES.adminAuditTrail, icon: ScrollText },
  { label: 'Settings', href: ROUTES.adminSettings, icon: Settings },
  { label: 'Profile', href: ROUTES.adminProfile, icon: UserCog },
];

// Flattened from ADMIN_SECTIONS (single source of truth) for consumers that
// need a plain list — MobileTabBar's bottom tabs (first 4) + "More" sheet.
export const ADMIN_NAV: NavItem[] = ADMIN_SECTIONS.flatMap((entry) =>
  isNavGroup(entry) ? entry.items : [entry]
);

// Short enough as-is — no grouping needed.
export const STAFF_NAV: NavItem[] = [
  { label: 'Overview', href: ROUTES.staff, icon: LayoutDashboard },
  { label: 'Appointments', href: ROUTES.staffAppointments, icon: CalendarCheck },
  { label: 'Quick Bill', href: ROUTES.staffBilling, icon: Receipt },
  { label: 'My Schedule', href: ROUTES.staffSchedule, icon: CalendarDays },
  { label: 'Book Appointment', href: ROUTES.staffBook, icon: Sparkles },
  { label: 'Sales', href: ROUTES.staffSales, icon: History },
  { label: 'Profile', href: ROUTES.staffProfile, icon: UserCog },
];

export const PUBLIC_NAV: NavItem[] = [
  { label: 'Home', href: ROUTES.home, icon: Home },
  { label: 'Services', href: ROUTES.services, icon: Sparkles },
  { label: 'Our Packages', href: ROUTES.packages, icon: Gift },
  { label: 'About', href: ROUTES.about, icon: UserCircle },
  { label: 'Gallery', href: ROUTES.gallery, icon: Package },
  { label: 'Contact', href: ROUTES.contact, icon: Settings },
];
