import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);

  const bootstrap = useAuthStore((s) => s.bootstrap);
  const passwordLogin = useAuthStore((s) => s.passwordLogin);
  const register = useAuthStore((s) => s.register);
  const requestOtp = useAuthStore((s) => s.requestOtp);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const confirmPasswordReset = useAuthStore((s) => s.confirmPasswordReset);
  const changePassword = useAuthStore((s) => s.changePassword);
  const googleLogin = useAuthStore((s) => s.googleLogin);
  const logout = useAuthStore((s) => s.logout);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  return {
    user,
    isAuthenticated,
    loading,
    role: user?.role ?? null,
    bootstrap,
    passwordLogin,
    register,
    requestOtp,
    verifyOtp,
    requestPasswordReset,
    confirmPasswordReset,
    changePassword,
    googleLogin,
    logout,
    updateProfile,
  };
}
