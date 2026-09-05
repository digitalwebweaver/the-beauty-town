import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import DashboardHeader from '@/components/layout/DashboardHeader';
import type { NavItem } from '@/constants/navigation';

interface DashboardLayoutProps {
  nav: NavItem[];
  label: string;
}

function DashboardLayout({ nav, label }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar items={nav} label={label} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader mobileNav={nav} mobileLabel={label} />
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
