import { lazy } from 'react';

// Every page is its own lazily-loaded chunk rather than bundled eagerly
// into the app's entry file — a customer visiting the public homepage
// used to download the entire admin back office (Coupon Designer, Quick
// Bill, every management screen) along with it.
export const HomePage = lazy(() => import('@/pages/public/HomePage'));
export const ServicesPage = lazy(() => import('@/pages/public/ServicesPage'));
export const PackagesPage = lazy(() => import('@/pages/public/PackagesPage'));
export const BridalPackagesPage = lazy(() => import('@/pages/public/BridalPackagesPage'));
export const GroomPackagesPage = lazy(() => import('@/pages/public/GroomPackagesPage'));
export const DestinationPackagePage = lazy(() => import('@/pages/public/DestinationPackagePage'));
export const AboutPage = lazy(() => import('@/pages/public/AboutPage'));
export const GalleryPage = lazy(() => import('@/pages/public/GalleryPage'));
export const ContactPage = lazy(() => import('@/pages/public/ContactPage'));

export const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
export const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
export const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));

export const CustomerDashboardPage = lazy(() => import('@/pages/customer/CustomerDashboardPage'));
export const MyAppointmentsPage = lazy(() => import('@/pages/customer/MyAppointmentsPage'));
export const BookAppointmentPage = lazy(() => import('@/pages/customer/BookAppointmentPage'));
export const ProfilePage = lazy(() => import('@/pages/common/ProfilePage'));

export const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
export const ServicesManagementPage = lazy(() => import('@/pages/admin/ServicesManagementPage'));
export const PackagesManagementPage = lazy(() => import('@/pages/admin/PackagesManagementPage'));
export const HolidaysPage = lazy(() => import('@/pages/admin/HolidaysPage'));
export const StaffManagementPage = lazy(() => import('@/pages/admin/StaffManagementPage'));
export const AppointmentsManagementPage = lazy(
  () => import('@/pages/admin/AppointmentsManagementPage')
);
export const CustomersPage = lazy(() => import('@/pages/admin/CustomersPage'));
export const CustomerProfilePage = lazy(() => import('@/pages/admin/CustomerProfilePage'));
export const InventoryPage = lazy(() => import('@/pages/admin/InventoryPage'));
export const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'));
export const CouponsPage = lazy(() => import('@/pages/admin/CouponsPage'));
export const CouponDesignerPage = lazy(() => import('@/pages/admin/CouponDesignerPage'));

export const StaffDashboardPage = lazy(() => import('@/pages/staff/StaffDashboardPage'));
export const SchedulePage = lazy(() => import('@/pages/staff/SchedulePage'));
export const StaffAppointmentsPage = lazy(() => import('@/pages/staff/StaffAppointmentsPage'));
export const QuickBillingPage = lazy(() => import('@/pages/staff/QuickBillingPage'));
export const SalesHistoryPage = lazy(() => import('@/pages/staff/SalesHistoryPage'));

export const InvoicePage = lazy(() => import('@/pages/public/InvoicePage'));
export const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// React Query Devtools are dev-only tooling with no reason to ship to
// production — `import.meta.env.DEV` is inlined to a literal by Vite, so
// Rollup dead-code-eliminates this whole branch (including the dynamic
// import call) out of the production bundle entirely.
export const LazyReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools }))
    )
  : () => null;
