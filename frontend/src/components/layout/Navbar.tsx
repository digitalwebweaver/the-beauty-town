import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronDown, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { PUBLIC_NAV } from '@/constants/navigation';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useSettings, SETTINGS_FALLBACK } from '@/services/settings.api';

interface NavDropdownLink {
  label: string;
  to: string;
}

// A handful of top-level nav items open a dropdown of sub-pages instead of
// navigating directly — mirrors thebeautytownsalon.com's own "Our Services"
// and "Our Packages" menus.
const NAV_DROPDOWNS: Record<string, NavDropdownLink[]> = {
  [ROUTES.services]: [
    { label: 'Services for Female', to: `${ROUTES.services}?gender=female` },
    { label: 'Services for Male', to: `${ROUTES.services}?gender=male` },
  ],
  [ROUTES.packages]: [
    { label: 'Bridal Packages', to: ROUTES.bridalPackages },
    { label: 'Groom Packages', to: ROUTES.groomPackages },
    { label: 'Destination Package', to: ROUTES.destinationPackage },
  ],
};

function Navbar() {
  const { isAuthenticated, role } = useAuth();
  const settings = useSettings().data ?? SETTINGS_FALLBACK;
  const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(null);

  const dashboardHref =
    role === 'admin' ? ROUTES.admin : role === 'staff' ? ROUTES.staff : ROUTES.customerDashboard;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link to={ROUTES.home} className="flex items-center gap-2.5">
          <img src="/brand/logo.png" alt="" className="h-10 w-10 object-contain" />
          <span className="font-display text-lg font-semibold tracking-tight text-brand-maroon-dark">
            {settings.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {PUBLIC_NAV.map((item) => {
            const dropdownLinks = NAV_DROPDOWNS[item.href];
            if (!dropdownLinks) {
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-2 font-display text-sm font-medium transition-colors',
                      isActive
                        ? 'text-brand-maroon underline decoration-2 underline-offset-8'
                        : 'text-brand-maroon-dark/80 hover:text-brand-maroon'
                    )
                  }
                >
                  {item.label}
                </NavLink>
              );
            }

            return (
              <DropdownMenu key={item.href}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-md px-3 py-2 font-display text-sm font-medium text-brand-maroon-dark/80 outline-none transition-colors hover:text-brand-maroon aria-expanded:text-brand-maroon"
                  >
                    {item.label}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  className="min-w-56 rounded-none border-none bg-brand-maroon-dark p-0 text-white shadow-xl"
                >
                  {dropdownLinks.map((link) => (
                    <DropdownMenuItem key={link.to} asChild className="rounded-none p-0">
                      <Link
                        to={link.to}
                        className="block w-full px-5 py-3 font-display text-sm text-white/90 hover:bg-white/10 hover:text-brand-gold focus:bg-white/10 focus:text-brand-gold"
                      >
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <Button asChild className="bg-brand-maroon text-white hover:bg-brand-maroon/90">
              <Link to={dashboardHref}>Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                asChild
                className="text-brand-maroon-dark hover:bg-brand-maroon-dark/5 hover:text-brand-maroon"
              >
                <Link to={ROUTES.login}>Login</Link>
              </Button>
              <Button asChild className="bg-brand-maroon text-white hover:bg-brand-maroon/90">
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
              className="h-10 w-10 text-brand-maroon-dark hover:bg-brand-maroon-dark/5 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 max-w-[85vw]">
            <SheetHeader>
              <SheetTitle>{settings.name}</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-2 px-4">
              {PUBLIC_NAV.map((item) => {
                const dropdownLinks = NAV_DROPDOWNS[item.href];
                if (!dropdownLinks) {
                  return (
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
                  );
                }

                const isOpen = openMobileDropdown === item.href;
                return (
                  <div key={item.href}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenMobileDropdown(isOpen ? null : item.href)}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      {item.label}
                      <ChevronDown
                        className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
                      />
                    </button>
                    {isOpen && (
                      <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
                        {dropdownLinks.map((link) => (
                          <Link
                            key={link.to}
                            to={link.to}
                            className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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
