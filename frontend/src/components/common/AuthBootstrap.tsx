import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * On first mount, ask the backend whether we're logged in (via httpOnly cookie).
 * The response updates the store; children can then render authenticated UI.
 */
function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return <>{children}</>;
}

export default AuthBootstrap;
