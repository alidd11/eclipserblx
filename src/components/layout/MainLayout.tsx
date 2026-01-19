import { ReactNode, forwardRef, useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { CustomerSidebar } from './CustomerSidebar';
import { safeStorage } from '@/lib/safeStorage';
import { SearchCommandProvider, useSearchCommand } from '@/hooks/useSearchCommand';
import { SearchCommandPalette } from '@/components/search/SearchCommandPalette';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { hapticTap } from '@/lib/haptics';

interface MainLayoutProps {
  children: ReactNode;
}

const COLLAPSED_KEY = 'customer-sidebar-collapsed';
const EDGE_THRESHOLD = 30; // pixels from left edge to trigger swipe
const MIN_SWIPE_DISTANCE = 50;

function MainLayoutContent({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = safeStorage.getItem(COLLAPSED_KEY);
    return stored === 'true';
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { open: searchOpen, setOpen: setSearchOpen } = useSearchCommand();

  // Touch tracking for edge swipe
  const touchStartRef = useRef<{ x: number; y: number; isEdge: boolean } | null>(null);

  useEffect(() => {
    safeStorage.setItem(COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Handle edge swipe to open drawer
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    const isEdge = touch.clientX <= EDGE_THRESHOLD;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, isEdge };
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current?.isEdge) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    
    // Only trigger if horizontal swipe is dominant
    if (deltaX > MIN_SWIPE_DISTANCE && deltaY < deltaX) {
      hapticTap();
      setMobileDrawerOpen(true);
    }
    
    touchStartRef.current = null;
  }, []);

  // Add touch listeners for edge swipe (mobile only)
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (!isMobile) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return (
    <>
      <div className="min-h-[100dvh] flex w-full bg-background overflow-x-hidden">
        {/* Desktop Sidebar */}
        <CustomerSidebar 
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex"
        />
        
        {/* Mobile Sidebar Drawer */}
        <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
          <SheetContent 
            side="left" 
            className="p-0 w-72 border-r border-border"
            data-gesture-exempt="true"
          >
            <CustomerSidebar 
              collapsed={false}
              onToggle={() => setMobileDrawerOpen(false)}
              onNavigate={() => setMobileDrawerOpen(false)}
              isMobileDrawer
            />
          </SheetContent>
        </Sheet>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header showDesktopNav={false} onMenuClick={() => setMobileDrawerOpen(true)} />
          <main className="flex-1 overflow-x-hidden">{children}</main>
          <Footer />
        </div>
      </div>

      {/* Search Command Palette */}
      <SearchCommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

export const MainLayout = forwardRef<HTMLDivElement, MainLayoutProps>(
  function MainLayout({ children }, ref) {
    return (
      <SearchCommandProvider>
        <div ref={ref}>
          <MainLayoutContent>{children}</MainLayoutContent>
        </div>
      </SearchCommandProvider>
    );
  }
);
