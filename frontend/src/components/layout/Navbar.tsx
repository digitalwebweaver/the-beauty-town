import { Link, NavLink } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { PUBLIC_NAV } from '@/constants/navigation';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useSettings, SETTINGS_FALLBACK } from '@/services/settings.api';

function Navbar() {
  const { isAuthenticated, role } = useAuth();
  const settings = useSettings().data ?? SETTINGS_FALLBACK;

  const dashboardHref =
    role === 'admin' ? ROUTES.admin : role === 'staff' ? ROUTES.staff : ROUTES.customerDashboard;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-brand-gold/20 bg-brand-maroon-dark backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link to={ROUTES.home} className="flex items-center gap-2.5">
          <img src="/brand/logo.png" alt="" className="h-10 w-10 object-contain" />
          <span className="font-display text-lg font-semibold tracking-tight text-white">
            {settings.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {PUBLIC_NAV.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'text-brand-gold' : 'text-white/75 hover:text-brand-gold'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <Button asChild className="bg-brand-gold text-brand-maroon-dark hover:bg-brand-gold/90">
              <Link to={dashboardHref}>Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                asChild
                className="text-white/85 hover:bg-white/10 hover:text-white"
              >
                <Link to={ROUTES.login}>Login</Link>
              </Button>
              <Button
                asChild
                className="bg-brand-gold text-brand-maroon-dark hover:bg-brand-gold/90"
              >
                <Link to={ROUTES.register}>Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-white hover:bg-white/10 hover:text-white md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 max-w-[85vw]">
            <SheetHeader>
              <SheetTitle>{settings.name}</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-2 px-4">
              {PUBLIC_NAV.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-2 text-sm font-medium',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="mt-4 flex flex-col gap-2 border-t pt-4">
                {isAuthenticated ? (
                  <Button asChild>
                    <Link to={dashboardHref}>Go to Dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" asChild>
                      <Link to={ROUTES.login}>Login</Link>
                    </Button>
                    <Button asChild>
                      <Link to={ROUTES.register}>Sign Up</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export default Navbar;
