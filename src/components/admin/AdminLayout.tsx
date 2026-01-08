import { ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminInstallPrompt } from './AdminInstallPrompt';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2, Menu, RefreshCw } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useSupportTicketNotifications } from '@/hooks/useSupportTicketNotifications';

const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed';

interface AdminLayoutProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export function AdminLayout({ children, requiredRoles = [] }: AdminLayoutProps) {
  const { user, isStaff, isAdmin, hasRole, loading } = useAdminAuth();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });

  // Check if running as PWA
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    window.location.reload();
  };
  
  // Swipe gesture tracking
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isEdgeSwipe = useRef(false);

  // Handle swipe from left edge to open sidebar
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    // Mark as edge swipe if starting near left edge
    isEdgeSwipe.current = touch.clientX < 30;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    // Prevent browser back gesture when swiping from left edge
    if (isEdgeSwipe.current && touchStartX.current !== null) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      if (deltaX > 10) {
        e.preventDefault();
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = Math.abs(touch.clientY - touchStartY.current);
    
    // Only trigger if horizontal swipe is dominant and started from left edge
    if (touchStartX.current < 30 && deltaX > 40 && deltaY < 100 && !mobileOpen) {
      setMobileOpen(true);
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
    isEdgeSwipe.current = false;
  }, [mobileOpen]);

  // Add edge swipe listener for mobile
  useEffect(() => {
    if (!isMobile) return;
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Enable support ticket notifications for all admin pages
  useSupportTicketNotifications();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-display font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access the admin area.</p>
        </div>
      </div>
    );
  }

  // Check required roles
  if (requiredRoles.length > 0 && !isAdmin) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role));
    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-display font-bold">Access Denied</h1>
            <p className="text-muted-foreground">You don't have the required permissions for this page.</p>
          </div>
        </div>
      );
    }
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen flex bg-background">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <AdminSidebar 
            collapsed={sidebarCollapsed} 
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
          />
        )}

        {/* Mobile Sidebar (Sheet with swipe support) */}
        {isMobile && (
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent 
              side="left" 
              className="p-0 w-[68vw] max-w-[14.5rem] pt-[env(safe-area-inset-top)] [&>button]:hidden"
              onPointerDownOutside={() => setMobileOpen(false)}
            >
              <div 
                className="h-full"
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  (e.currentTarget as any)._touchStartX = touch.clientX;
                }}
                onTouchEnd={(e) => {
                  const touchStartX = (e.currentTarget as any)._touchStartX;
                  const touchEndX = e.changedTouches[0].clientX;
                  const swipeDistance = touchStartX - touchEndX;
                  
                  // Swipe left to close (threshold of 50px)
                  if (swipeDistance > 50) {
                    setMobileOpen(false);
                  }
                }}
              >
                <AdminSidebar 
                  collapsed={false} 
                  onToggle={() => setMobileOpen(false)}
                  onNavigate={() => setMobileOpen(false)}
                  isMobileDrawer
                />
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Swipe Indicator - Left Edge Hint (kept clear of iOS status bar) */}
        {isMobile && !mobileOpen && (
          <div 
            className="fixed left-0 top-[calc(50%+env(safe-area-inset-top))] -translate-y-1/2 z-30 flex items-center"
            onClick={() => setMobileOpen(true)}
          >
            <div className="w-1 h-16 bg-primary/40 rounded-r-full shadow-lg shadow-primary/20 transition-all duration-300 hover:w-1.5 hover:bg-primary/60 active:bg-primary/80">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-24 -ml-1" />
            </div>
          </div>
        )}
        <div className="flex-1 flex flex-col overflow-auto">
          {isMobile && (
            <header className="sticky top-0 z-40 border-b border-border bg-card px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="shrink-0"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <span className="font-display font-bold">Admin Dashboard</span>
              </div>
              {isStandalone && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
                </Button>
              )}
            </header>
          )}
          
          {/* Mobile PWA Install Prompt */}
          {isMobile && <AdminInstallPrompt />}
          
          <main className="flex-1">
            <div className="p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
