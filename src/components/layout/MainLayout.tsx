import { ReactNode, forwardRef, useState, useEffect } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { CustomerSidebar } from './CustomerSidebar';
import { safeStorage } from '@/lib/safeStorage';

interface MainLayoutProps {
  children: ReactNode;
}

const COLLAPSED_KEY = 'customer-sidebar-collapsed';

export const MainLayout = forwardRef<HTMLDivElement, MainLayoutProps>(
  function MainLayout({ children }, ref) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
      const stored = safeStorage.getItem(COLLAPSED_KEY);
      return stored === 'true';
    });

    useEffect(() => {
      safeStorage.setItem(COLLAPSED_KEY, String(sidebarCollapsed));
    }, [sidebarCollapsed]);

    return (
      <div ref={ref} className="min-h-[100dvh] flex w-full bg-background overflow-x-hidden">
        {/* Desktop Sidebar */}
        <CustomerSidebar 
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex"
        />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header showDesktopNav={false} />
          <main className="flex-1 overflow-x-hidden">{children}</main>
          <Footer />
        </div>
      </div>
    );
  }
);
