import { Loader2 } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, loading, role } = useAuth();
  const location = useLocation();

  // Auth state rehydrates from storage and re-confirms against /auth/me
  // asynchronously — `loading` covers that whole window (both persisted-
  // state hydration and the real network round-trip). Deciding to redirect
  // before it settles is exactly what made a hard refresh on any protected
  // page briefly read "not logged in" and bounce a real session to /login.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const home =
      role === 'admin' ? ROUTES.admin : role === 'staff' ? ROUTES.staff : ROUTES.customerDashboard;
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
