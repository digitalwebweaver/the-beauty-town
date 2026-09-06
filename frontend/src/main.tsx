import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import AuthBootstrap from '@/components/common/AuthBootstrap';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import PageLoader from '@/components/common/PageLoader';
import { queryClient } from '@/lib/queryClient';
import { registerServiceWorker } from '@/lib/registerServiceWorker';
import { ROUTES } from '@/constants/routes';
import { ADMIN_NAV, ADMIN_SECTIONS, CUSTOMER_NAV, STAFF_NAV } from '@/constants/navigation';

import PublicLayout from '@/layouts/PublicLayout';
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import ProtectedRoute from '@/routes/ProtectedRoute';

import {
  AboutPage,
  AdminDashboardPage,
  AppointmentsManagementPage,
  AuditTrailPage,
  BookAppointmentPage,
  BridalPackagesPage,
  CategoriesManagementPage,
  ContactPage,
  CouponDesignerPage,
  CouponsPage,
  CustomerDashboardPage,
  CustomerProfilePage,
  CustomersPage,
  DestinationPackagePage,
  ForgotPasswordPage,
  GalleryPage,
  GroomPackagesPage,
  HolidaysPage,
  HomePage,
  InventoryPage,
  InvoicePage,
  LazyReactQueryDevtools,
  LoginPage,
  MyAppointmentsPage,
  NotFoundPage,
  PackagesManagementPage,
  PackagesPage,
  ProfilePage,
  QuickBillingPage,
  RegisterPage,
  ReportsPage,
  SalesHistoryPage,
  SchedulePage,
  ServicesManagementPage,
  ServicesPage,
  SettingsPage,
  StaffAppointmentsPage,
  StaffDashboardPage,
  StaffManagementPage,
} from '@/routes/lazyPages';

import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthBootstrap>
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
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
                    <Route
                      element={
                        <DashboardLayout nav={ADMIN_NAV} sections={ADMIN_SECTIONS} label="Admin" />
                      }
                    >
                      <Route path={ROUTES.admin} element={<AdminDashboardPage />} />
                      <Route path={ROUTES.adminServices} element={<ServicesManagementPage />} />
                      <Route path={ROUTES.adminCategories} element={<CategoriesManagementPage />} />
                      <Route path={ROUTES.adminPackages} element={<PackagesManagementPage />} />
                      <Route path={ROUTES.adminHolidays} element={<HolidaysPage />} />
                      <Route path={ROUTES.adminStaff} element={<StaffManagementPage />} />
                      <Route
                        path={ROUTES.adminAppointments}
                        element={<AppointmentsManagementPage />}
                      />
                      <Route path={ROUTES.adminCustomers} element={<CustomersPage />} />
                      <Route
                        path={ROUTES.adminCustomerProfile()}
                        element={<CustomerProfilePage />}
                      />
                      <Route path={ROUTES.adminInventory} element={<InventoryPage />} />
                      <Route path={ROUTES.adminBilling} element={<QuickBillingPage />} />
                      <Route path={ROUTES.adminSales} element={<SalesHistoryPage />} />
                      <Route path={ROUTES.adminReports} element={<ReportsPage />} />
                      <Route path={ROUTES.adminAuditTrail} element={<AuditTrailPage />} />
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
              </Suspense>
            </ErrorBoundary>
            <Toaster position="top-right" richColors />
          </AuthBootstrap>
        </BrowserRouter>
        <Suspense fallback={null}>
          <LazyReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>
);

registerServiceWorker();
