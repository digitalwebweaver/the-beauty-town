import { Link, Outlet } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { SALON_INFO } from '@/lib/mockData';
import FallbackImage from '@/components/common/FallbackImage';

function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <FallbackImage
          src="/brand/gallery/portfolio-2.webp"
          alt="Bridal makeup by The Beauty Town"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/70 via-black/40 to-black/70" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link to={ROUTES.home} className="flex items-center gap-2">
            <img src="/brand/logo.png" alt="" className="h-10 w-10 object-contain" />
            <span className="text-lg font-bold">{SALON_INFO.name}</span>
          </Link>

          <div>
            <p className="max-w-md text-3xl font-semibold leading-snug">
              “Beauty begins the moment you decide to be yourself.”
            </p>
            <p className="mt-3 text-sm text-white/80">— Coco Chanel</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
