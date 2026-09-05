import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROUTES } from '@/constants/routes';
import { formatDateTime } from '@/lib/formatDate';
import { useAuth } from '@/hooks/useAuth';
import { useAllAppointments, useMyAppointments } from '@/services/appointments.api';
import { useProducts } from '@/services/products.api';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  href: string;
}

// Real, role-appropriate alerts computed from data the app already fetches
// elsewhere — no separate notifications backend to keep in sync, and
// nothing shown here is ever fabricated placeholder content.
function NotificationBell() {
  const { role } = useAuth();
  const isStaffLike = role === 'admin' || role === 'staff';
  const today = new Date().toISOString().slice(0, 10);

  // Admin/staff: today's bookings still awaiting confirmation (staff sees
  // only their own — enforced server-side, see appointments.controller.ts).
  const pendingToday = useAllAppointments({
    status: 'pending',
    from: today,
    to: today,
    enabled: isStaffLike,
  });

  // Low stock is an admin concern only (staff can see the product list for
  // billing, but restocking decisions are the admin's).
  const products = useProducts({ enabled: role === 'admin' });
  const lowStock = (products.data ?? []).filter((p) => p.is_active && p.stock <= p.reorder_level);

  // Customer: a reminder for their own next upcoming booking.
  const myAppointments = useMyAppointments({ enabled: role === 'customer' });
  const nextAppointment = [...(myAppointments.data ?? [])]
    .filter(
      (a) => (a.status === 'pending' || a.status === 'confirmed') && a.appointment_date >= today
    )
    .sort((a, b) =>
      `${a.appointment_date}${a.start_time}`.localeCompare(`${b.appointment_date}${b.start_time}`)
    )[0];

  const items: NotificationItem[] = [];

  if (isStaffLike && pendingToday.data?.length) {
    items.push({
      id: 'pending-today',
      title: `${pendingToday.data.length} booking${pendingToday.data.length === 1 ? '' : 's'} awaiting confirmation`,
      description: 'Scheduled for today',
      href: role === 'admin' ? ROUTES.adminAppointments : ROUTES.staffAppointments,
    });
  }

  if (role === 'admin' && lowStock.length) {
    items.push({
      id: 'low-stock',
      title: `${lowStock.length} product${lowStock.length === 1 ? '' : 's'} low on stock`,
      description:
        lowStock
          .slice(0, 3)
          .map((p) => p.name)
          .join(', ') + (lowStock.length > 3 ? ', …' : ''),
      href: ROUTES.adminInventory,
    });
  }

  if (role === 'customer' && nextAppointment) {
    items.push({
      id: 'next-appointment',
      title: 'Upcoming appointment',
      description: `${nextAppointment.service_names.join(' + ')} — ${formatDateTime(nextAppointment.appointment_date, nextAppointment.start_time)}`,
      href: ROUTES.myAppointments,
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {items.length > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {items.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </p>
        ) : (
          items.map((n) => (
            <DropdownMenuItem
              key={n.id}
              asChild
              className="flex-col items-start gap-0.5 whitespace-normal py-2"
            >
              <Link to={n.href}>
                <span className="text-sm font-medium">{n.title}</span>
                <span className="text-xs text-muted-foreground">{n.description}</span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationBell;
