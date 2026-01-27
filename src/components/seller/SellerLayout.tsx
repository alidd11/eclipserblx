import { ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { SellerSidebar } from './SellerSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useMarketplaceAccess } from '@/hooks/useFeatureFlag';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2, Menu } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { safeStorage } from '@/lib/safeStorage';
import { hapticTap } from '@/lib/haptics';

const SIDEBAR_COLLAPSED_KEY = 'seller-sidebar-collapsed';
const EDGE_THRESHOLD = 30; // Match MainLayout edge threshold
const MIN_SWIPE_DISTANCE = 50;

interface SellerLayoutProps {
  children: ReactNode;
}

export function SellerLayout({ children }: SellerLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { isSeller: isApprovedSeller, loading: sellerLoading, store } = useSellerStatus();
  const { hasAccess, loading: flagLoading } = useMarketplaceAccess();
  const { isSeller: hasSellerRole, loading: roleLoading } = useAdminAuth();
  const isMobile = useIsMobile();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = safeStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });

  // Touch tracking for edge swipe - matching MainLayout pattern
  const touchStartRef = useRef<{ x: number; y: number; isEdge: boolean } | null>(null);

  // Toggle sidebar with haptic feedback
  const toggleSidebar = useCallback(() => {
    hapticTap();
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Keyboard shortcut: Ctrl/Cmd + B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  // Handle edge swipe to open drawer - matching MainLayout pattern
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (mobileOpen) return;
    
    const target = e.target as Element | null;
    if (target?.closest?.('[data-gesture-exempt="true"]')) return;
    
    const touch = e.touches[0];
    const isEdge = touch.clientX <= EDGE_THRESHOLD;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, isEdge };
  }, [mobileOpen]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current?.isEdge) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    
    // Only trigger if horizontal swipe is dominant
    if (deltaX > MIN_SWIPE_DISTANCE && deltaY < deltaX) {
      hapticTap();
      setMobileOpen(true);
    }
    
    touchStartRef.current = null;
  }, []);

  // Add touch listeners for edge swipe (mobile only)
  useEffect(() => {
    if (!isMobile) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, handleTouchStart, handleTouchEnd]);

  useEffect(() => {
    safeStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const loading = authLoading || sellerLoading || flagLoading || roleLoading;

  // User can access seller dashboard if they have the seller role OR have an approved store
  const canAccessSellerDashboard = hasSellerRole || isApprovedSeller;

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

  if (!canAccessSellerDashboard) {
    return <Navigate to="/account" replace />;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-[100dvh] flex w-full bg-background overflow-x-hidden relative">
        {/* Desktop Sidebar */}
        <SellerSidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          className="hidden md:flex"
        />

        {/* Mobile Sidebar Drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="p-0 w-72 border-r-0"
            data-gesture-exempt="true"
          >
            <SellerSidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
              isMobileDrawer
            />
          </SheetContent>
        </Sheet>

        {/* Main Content - Fixed header with scrollable content */}
        <div className="flex-1 flex flex-col min-w-0 h-[100dvh]">
          {/* Sticky Header */}
          <header className="sticky top-0 z-40 w-full glass-effect pt-[env(safe-area-inset-top)]">
            <div className="px-4">
              <div className="flex h-14 sm:h-16 items-center justify-between gap-4">
                {/* Left side - Menu + Store Name */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 md:hidden"
                    onClick={() => {
                      hapticTap();
                      setMobileOpen(true);
                    }}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                  <div className="min-w-0">
                    <h1 className="font-display font-bold text-lg truncate text-primary">
                      {store?.name || 'My Store'}
                    </h1>
                    <p className="text-xs text-muted-foreground hidden sm:block">Seller Dashboard</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-4 md:p-6 lg:p-8 pb-[env(safe-area-inset-bottom)]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
