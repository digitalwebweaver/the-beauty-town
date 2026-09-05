import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, MoreHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import type { NavItem } from '@/constants/navigation';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface MobileTabBarProps {
  items: NavItem[];
  label: string;
}

// The primary, app-like navigation chrome on phone/tablet — replaces the
// old hamburger-menu-opens-a-drawer pattern (which reads as "a responsive
// website") with a persistent bottom tab bar (which reads as "an app").
// The first 4 items in `items` (see navigation.tsx — order is deliberate)
// become tabs; anything past that folds into a bottom "More" sheet.
function MobileTabBar({ items, label }: MobileTabBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const primary = items.slice(0, 4);
  const overflow = items.slice(4);

  const handleLogout = () => {
    setMoreOpen(false);
    logout();
    navigate(ROUTES.home);
  };

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
      isActive ? 'font-semibold text-primary' : 'text-muted-foreground'
    );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {primary.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink key={item.href} to={item.href} end className={tabClass}>
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'mb-0.5 h-1 w-1 rounded-full',
                    isActive ? 'bg-primary' : 'bg-transparent'
                  )}
                />
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </>
            )}
          </NavLink>
        );
      })}

      {overflow.length > 0 && (
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground"
            >
              <span className="mb-0.5 h-1 w-1 rounded-full bg-transparent" />
              <MoreHorizontal className="h-[18px] w-[18px]" />
              More
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[75vh] rounded-t-2xl p-0">
            <SheetHeader className="border-b px-4 py-4 text-left">
              <SheetTitle>{label}</SheetTitle>
            </SheetHeader>
            <nav className="max-h-[calc(75vh-140px)] space-y-1 overflow-y-auto p-4">
              {overflow.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-accent'
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
            <div className="border-t p-4">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </nav>
  );
}

export default MobileTabBar;
