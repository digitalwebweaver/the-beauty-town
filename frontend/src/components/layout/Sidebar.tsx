import { Link, NavLink } from 'react-router-dom';
import { LogOut, Sparkles } from 'lucide-react';
import type { NavItem } from '@/constants/navigation';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSettings, SETTINGS_FALLBACK } from '@/services/settings.api';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  items: NavItem[];
  label: string;
}

function Sidebar({ items, label }: SidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const settings = useSettings().data ?? SETTINGS_FALLBACK;

  const handleLogout = () => {
    logout();
    navigate(ROUTES.home);
  };

  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:flex-col">
      <Link to={ROUTES.home} className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">{settings.name}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
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
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </aside>
  );
}

export default Sidebar;
