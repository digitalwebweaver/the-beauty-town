import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import DashboardHeader from '@/components/layout/DashboardHeader';
import MobileTabBar from '@/components/layout/MobileTabBar';
import InstallAppBanner from '@/components/common/InstallAppBanner';
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
        <DashboardHeader />
        {/* Extra bottom padding on mobile/tablet clears the fixed
            MobileTabBar — desktop (md+) doesn't render that bar at all,
            so it reverts to the plain p-8. */}
        <main className="flex-1 p-4 pb-24 md:p-8">
          <InstallAppBanner />
          <Outlet />
        </main>
      </div>
      <MobileTabBar items={nav} label={label} />
    </div>
  );
}

export default DashboardLayout;
