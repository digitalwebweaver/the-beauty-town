import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import AuthBootstrap from '@/components/common/AuthBootstrap';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { queryClient } from '@/lib/queryClient';
import { registerServiceWorker } from '@/lib/registerServiceWorker';
import { ROUTES } from '@/constants/routes';
import { ADMIN_NAV, CUSTOMER_NAV, STAFF_NAV } from '@/constants/navigation';

import PublicLayout from '@/layouts/PublicLayout';
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import ProtectedRoute from '@/routes/ProtectedRoute';

import HomePage from '@/pages/public/HomePage';
import ServicesPage from '@/pages/public/ServicesPage';
import PackagesPage from '@/pages/public/PackagesPage';
import BridalPackagesPage from '@/pages/public/BridalPackagesPage';
import GroomPackagesPage from '@/pages/public/GroomPackagesPage';
import DestinationPackagePage from '@/pages/public/DestinationPackagePage';
import AboutPage from '@/pages/public/AboutPage';
import GalleryPage from '@/pages/public/GalleryPage';
import ContactPage from '@/pages/public/ContactPage';

import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';

import CustomerDashboardPage from '@/pages/customer/CustomerDashboardPage';
import MyAppointmentsPage from '@/pages/customer/MyAppointmentsPage';
import BookAppointmentPage from '@/pages/customer/BookAppointmentPage';
import ProfilePage from '@/pages/common/ProfilePage';

import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import ServicesManagementPage from '@/pages/admin/ServicesManagementPage';
import PackagesManagementPage from '@/pages/admin/PackagesManagementPage';
import HolidaysPage from '@/pages/admin/HolidaysPage';
import StaffManagementPage from '@/pages/admin/StaffManagementPage';
import AppointmentsManagementPage from '@/pages/admin/AppointmentsManagementPage';
import CustomersPage from '@/pages/admin/CustomersPage';
import CustomerProfilePage from '@/pages/admin/CustomerProfilePage';
import InventoryPage from '@/pages/admin/InventoryPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import CouponsPage from '@/pages/admin/CouponsPage';
import CouponDesignerPage from '@/pages/admin/CouponDesignerPage';

import StaffDashboardPage from '@/pages/staff/StaffDashboardPage';
import SchedulePage from '@/pages/staff/SchedulePage';
import StaffAppointmentsPage from '@/pages/staff/StaffAppointmentsPage';
import QuickBillingPage from '@/pages/staff/QuickBillingPage';
import SalesHistoryPage from '@/pages/staff/SalesHistoryPage';

import InvoicePage from '@/pages/public/InvoicePage';
import NotFoundPage from '@/pages/NotFoundPage';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthBootstrap>
            <ErrorBoundary>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route path={ROUTES.home} element={<HomePage />} />
                  <Route path={ROUTES.guestBook} element={<BookAppointmentPage />} />
                  <Route path={ROUTES.services} element={<ServicesPage />} />
                  <Route path={ROUTES.packages} element={<PackagesPage />} />
                  <Route path={ROUTES.bridalPackages} element={<BridalPackagesPage />} />
                  <Route path={ROUTES.groomPackages} element={<GroomPackagesPage />} />
                  <Route path={ROUTES.destinationPackage} element={<DestinationPackagePage />} />
                  <Route path={ROUTES.about} element={<AboutPage />} />
                  <Route path={ROUTES.gallery} element={<GalleryPage />} />
                  <Route path={ROUTES.contact} element={<ContactPage />} />
                </Route>

                <Route element={<AuthLayout />}>
                  <Route path={ROUTES.login} element={<LoginPage />} />
                  <Route path={ROUTES.register} element={<RegisterPage />} />
                  <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
                  <Route element={<DashboardLayout nav={CUSTOMER_NAV} label="Customer" />}>
                    <Route path={ROUTES.customerDashboard} element={<CustomerDashboardPage />} />
                    <Route path={ROUTES.myAppointments} element={<MyAppointmentsPage />} />
                    <Route path={ROUTES.book} element={<BookAppointmentPage />} />
                    <Route path={ROUTES.profile} element={<ProfilePage />} />
                  </Route>
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                  <Route element={<DashboardLayout nav={ADMIN_NAV} label="Admin" />}>
                    <Route path={ROUTES.admin} element={<AdminDashboardPage />} />
                    <Route path={ROUTES.adminServices} element={<ServicesManagementPage />} />
                    <Route path={ROUTES.adminPackages} element={<PackagesManagementPage />} />
                    <Route path={ROUTES.adminHolidays} element={<HolidaysPage />} />
                    <Route path={ROUTES.adminStaff} element={<StaffManagementPage />} />
                    <Route
                      path={ROUTES.adminAppointments}
                      element={<AppointmentsManagementPage />}
                    />
                    <Route path={ROUTES.adminCustomers} element={<CustomersPage />} />
                    <Route path={ROUTES.adminCustomerProfile()} element={<CustomerProfilePage />} />
                    <Route path={ROUTES.adminInventory} element={<InventoryPage />} />
                    <Route path={ROUTES.adminBilling} element={<QuickBillingPage />} />
                    <Route path={ROUTES.adminSales} element={<SalesHistoryPage />} />
                    <Route path={ROUTES.adminSettings} element={<SettingsPage />} />
                    <Route path={ROUTES.adminBook} element={<BookAppointmentPage />} />
                    <Route path={ROUTES.adminCoupons} element={<CouponsPage />} />
                    <Route path={ROUTES.adminCouponDesign} element={<CouponDesignerPage />} />
                    <Route path={ROUTES.adminProfile} element={<ProfilePage />} />
                  </Route>
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
                  <Route element={<DashboardLayout nav={STAFF_NAV} label="Staff" />}>
                    <Route path={ROUTES.staff} element={<StaffDashboardPage />} />
                    <Route path={ROUTES.staffSchedule} element={<SchedulePage />} />
                    <Route path={ROUTES.staffAppointments} element={<StaffAppointmentsPage />} />
                    <Route path={ROUTES.staffBilling} element={<QuickBillingPage />} />
                    <Route path={ROUTES.staffSales} element={<SalesHistoryPage />} />
                    <Route path={ROUTES.staffBook} element={<BookAppointmentPage />} />
                    <Route path={ROUTES.staffProfile} element={<ProfilePage />} />
                  </Route>
                </Route>

                <Route path={ROUTES.invoice()} element={<InvoicePage />} />

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </ErrorBoundary>
            <Toaster position="top-right" richColors />
          </AuthBootstrap>
        </BrowserRouter>
        <ReactQueryDevtools initialIsOpen={false} />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>
);

registerServiceWorker();
