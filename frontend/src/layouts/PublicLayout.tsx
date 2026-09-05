import { Outlet } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import WhatsAppFloatButton from '@/components/common/WhatsAppFloatButton';
import BackToTopButton from '@/components/common/BackToTopButton';

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFloatButton />
      <BackToTopButton />
    </div>
  );
}

export default PublicLayout;
