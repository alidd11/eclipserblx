import { ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { SellerSidebar } from './SellerSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useMarketplaceAccess } from '@/hooks/useFeatureFlag';
import { Loader2, Menu } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { safeStorage } from '@/lib/safeStorage';

const SIDEBAR_COLLAPSED_KEY = 'seller-sidebar-collapsed';

interface SellerLayoutProps {
  children: ReactNode;
}

export function SellerLayout({ children }: SellerLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { isSeller, loading: sellerLoading, store } = useSellerStatus();
  const { hasAccess, loading: flagLoading } = useMarketplaceAccess();
  const isMobile = useIsMobile();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = safeStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });

  // Swipe gesture tracking
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isEdgeSwipe = useRef(false);

  const EDGE_SWIPE_ZONE_PX = 100;
  const OPEN_SWIPE_MIN_X = 12;
  const HORIZONTAL_LOCK_RATIO = 1.1;

  // Handle swipe from left edge to open sidebar
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (mobileOpen) {
        isEdgeSwipe.current = false;
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }

      const target = e.target as Element | null;
      if (target?.closest?.('[data-gesture-exempt="true"]')) {
        isEdgeSwipe.current = false;
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }

      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      isEdgeSwipe.current = touch.clientX < EDGE_SWIPE_ZONE_PX;
    },
    [mobileOpen]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (mobileOpen) return;
      if (!isEdgeSwipe.current || touchStartX.current === null) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;

      if (deltaX > 0) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [mobileOpen]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);

      const isMostlyHorizontal = Math.abs(deltaX) > deltaY * HORIZONTAL_LOCK_RATIO;

      if (
        touchStartX.current < EDGE_SWIPE_ZONE_PX &&
        deltaX > OPEN_SWIPE_MIN_X &&
        isMostlyHorizontal &&
        !mobileOpen
      ) {
        setMobileOpen(true);
      }

      touchStartX.current = null;
      touchStartY.current = null;
      isEdgeSwipe.current = false;
    },
    [mobileOpen]
  );

  // Add edge swipe listener for mobile
  useEffect(() => {
    if (!isMobile) return;
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart, { capture: true });
      document.removeEventListener('touchmove', handleTouchMove, { capture: true });
      document.removeEventListener('touchend', handleTouchEnd, { capture: true });
    };
  }, [isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    safeStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const loading = authLoading || sellerLoading || flagLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  if (!isSeller) {
    return <Navigate to="/account" replace />;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        "flex min-h-screen w-full bg-background",
        "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      )}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <SellerSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        )}

        {/* Mobile Sidebar (Sheet) */}
        {isMobile && (
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent
              side="left"
              className="p-0 w-72 max-w-[85vw] border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))]"
              data-gesture-exempt="true"
            >
              <SellerSidebar
                collapsed={false}
                onToggle={() => {}}
                onNavigate={() => setMobileOpen(false)}
                isMobileDrawer
              />
            </SheetContent>
          </Sheet>
        )}

        {/* Main Content */}
        <main className={cn(
          "flex-1 flex flex-col min-w-0",
          "overflow-y-auto"
        )}>
          {/* Mobile Header */}
          {isMobile && (
            <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b px-4 py-3 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="font-display font-bold text-lg truncate text-primary">
                  {store?.name || 'My Store'}
                </h1>
                <p className="text-xs text-muted-foreground">Seller Dashboard</p>
              </div>
            </header>
          )}

          {/* Page Content */}
          <div className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
