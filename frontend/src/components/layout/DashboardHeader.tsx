import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import NotificationBell from '@/components/layout/NotificationBell';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';

// Mobile/tablet primary navigation now lives in MobileTabBar (a bottom tab
// bar, rendered by DashboardLayout) instead of a hamburger-opens-a-drawer
// here — this header is just search + notifications + account from here on,
// on every viewport. On phone/tablet specifically it also picks up the
// brand-maroon surface used across the rest of the mobile app shell; desktop
// keeps the existing neutral bar since the sidebar already carries branding
// there.
function DashboardHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.home);
  };

  const profileHref =
    user?.role === 'admin'
      ? ROUTES.adminProfile
      : user?.role === 'staff'
        ? ROUTES.staffProfile
        : ROUTES.profile;

  const initials = user?.name
    ?.split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-brand-maroon-dark px-4 md:border-b md:bg-background/80 md:px-8 md:backdrop-blur">
      <div className="relative max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70 md:text-muted-foreground" />
        <Input
          placeholder="Search…"
          className="border-white/20 bg-white/10 pl-9 text-white placeholder:text-white/60 md:border-input md:bg-background md:text-foreground md:placeholder:text-muted-foreground"
        />
      </div>

      {/* ml-auto pushes this cluster flush to the right edge regardless of
          the search box's width. */}
      <div className="ml-auto flex items-center gap-1">
        <NotificationBell className="text-white hover:bg-white/10 hover:text-white md:text-foreground md:hover:bg-accent md:hover:text-accent-foreground" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="gap-2 pl-2 pr-3 text-white hover:bg-white/10 hover:text-white md:text-foreground md:hover:bg-accent md:hover:text-accent-foreground"
            >
              <Avatar className="h-8 w-8 ring-1 ring-white/30 md:ring-0">
                <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden text-left text-sm md:block">
                <span className="block font-medium leading-tight">{user?.name}</span>
                <span className="block text-xs text-muted-foreground capitalize">{user?.role}</span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(profileHref)}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.home)}>Visit site</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default DashboardHeader;
