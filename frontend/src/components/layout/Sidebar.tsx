import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Sparkles } from 'lucide-react';
import { isNavGroup, type NavEntry } from '@/constants/navigation';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSettings, SETTINGS_FALLBACK } from '@/services/settings.api';

interface SidebarProps {
  sections: NavEntry[];
  label: string;
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
  );

function Sidebar({ sections, label }: SidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const settings = useSettings().data ?? SETTINGS_FALLBACK;

  // A group starts open if the current route is already inside it — so
  // landing on e.g. /admin/services doesn't hide the active link inside a
  // collapsed "Catalog" section with no clue where you are.
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () =>
      new Set(
        sections
          .filter(isNavGroup)
          .filter((g) => g.items.some((i) => location.pathname.startsWith(i.href)))
          .map((g) => g.label)
      )
  );

  const toggleGroup = (groupLabel: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupLabel)) next.delete(groupLabel);
      else next.add(groupLabel);
      return next;
    });
  };

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
        {sections.map((entry) => {
          if (!isNavGroup(entry)) {
            const Icon = entry.icon;
            return (
              <NavLink key={entry.href} to={entry.href} end className={linkClass}>
                <Icon className="h-4 w-4" />
                {entry.label}
              </NavLink>
            );
          }

          const GroupIcon = entry.icon;
          const isOpen = openGroups.has(entry.label);
          const hasActiveChild = entry.items.some((i) => location.pathname.startsWith(i.href));

          return (
            <div key={entry.label}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggleGroup(entry.label)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  hasActiveChild && !isOpen
                    ? 'text-sidebar-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <GroupIcon className="h-4 w-4" />
                <span className="flex-1 text-left">{entry.label}</span>
                <ChevronDown
                  className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')}
                />
              </button>
              {isOpen && (
                <div className="ml-3 mt-1 space-y-1 border-l pl-3">
                  {entry.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink key={item.href} to={item.href} end className={linkClass}>
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
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
