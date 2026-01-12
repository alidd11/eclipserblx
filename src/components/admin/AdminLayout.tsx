import { ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminInstallPrompt } from './AdminInstallPrompt';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2, Menu, RefreshCw } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { safeStorage } from '@/lib/safeStorage';
import { useSupportTicketNotifications } from '@/hooks/useSupportTicketNotifications';
import { useStaffPresence } from '@/hooks/useStaffPresence';
import { useAdminManifest } from '@/hooks/useAdminManifest';

const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed';

interface AdminLayoutProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export function AdminLayout({ children, requiredRoles = [] }: AdminLayoutProps) {
  const { user, isStaff, isAdmin, hasRole, loading } = useAdminAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const isChatPage =
    location.pathname === '/admin/admin-chat' || location.pathname === '/admin/staff-messages';

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = safeStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });

  // Check if running as PWA
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
  }, []);

  // Track visual viewport height for keyboard-aware layouts
  // We always set --vvh so the chat container can be sized reliably across iOS Safari/PWA.
  // When the keyboard is closed we pin --vv-top to 0 to avoid "stuck" offsets.
  useEffect(() => {
    const vv = window.visualViewport;

    const update = () => {
      const height = vv?.height ?? window.innerHeight;
      const windowHeight = window.innerHeight;

      // Keyboard is likely open if the visible viewport is significantly smaller
      const keyboardOpen = windowHeight - height > 100;

      document.documentElement.style.setProperty('--vvh', `${height * 0.01}px`);
      document.documentElement.style.setProperty('--vv-top', keyboardOpen ? `${vv?.offsetTop ?? 0}px` : '0px');
    };

    update();

    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // Reset viewport CSS variable when inputs lose focus (keyboard closes)
  // NOTE: We intentionally do NOT call window.scrollTo() here as it causes
  // visual jumping on mobile. The visualViewport API handles positioning naturally.
  useEffect(() => {
    if (!isMobile || !isChatPage) return;

    const syncViewportVars = () => {
      const vv = window.visualViewport;
      const height = vv?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--vvh', `${height * 0.01}px`);
      document.documentElement.style.setProperty('--vv-top', '0px');
    };

    const handleFocusOut = (e: FocusEvent) => {
      // Check if new focus target is also an input
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      const isInputFocused = relatedTarget?.tagName === 'INPUT' ||
        relatedTarget?.tagName === 'TEXTAREA';

      if (!isInputFocused) {
        // Keyboard is closing. iOS sometimes misses a final visualViewport resize,
        // so we sync a few times during the dismissal animation.
        setTimeout(syncViewportVars, 120);
        setTimeout(syncViewportVars, 260);
        setTimeout(syncViewportVars, 520);
      }
    };

    document.addEventListener('focusout', handleFocusOut);
    return () => document.removeEventListener('focusout', handleFocusOut);
  }, [isMobile, isChatPage]);

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
  const hasPrevented = useRef(false);

  // Handle swipe from left edge to open sidebar (maximum sensitivity)
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    hasPrevented.current = false;
    // Mark as edge swipe if starting near left edge (expanded zone to 100px for easier trigger)
    isEdgeSwipe.current = touch.clientX < 100;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    // Always prevent browser back gesture when swiping from left edge on PWA
    if (isEdgeSwipe.current && touchStartX.current !== null) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      // Immediately prevent any rightward swipe from the left edge
      if (deltaX > 0) {
        e.preventDefault();
        e.stopPropagation();
        hasPrevented.current = true;
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = Math.abs(touch.clientY - touchStartY.current);
    
    // Ultra-high sensitivity: 10px threshold, 100px edge zone, allow more vertical movement
    if (touchStartX.current < 100 && deltaX > 10 && deltaY < 200 && !mobileOpen) {
      setMobileOpen(true);
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
    isEdgeSwipe.current = false;
    hasPrevented.current = false;
  }, [mobileOpen]);

  // Add edge swipe listener for mobile - capture phase to intercept before browser
  useEffect(() => {
    if (!isMobile) return;
    
    // Use capture phase to intercept gestures before browser handles them
    document.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart, { capture: true });
      document.removeEventListener('touchmove', handleTouchMove, { capture: true });
      document.removeEventListener('touchend', handleTouchEnd, { capture: true });
    };
  }, [isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Enable support ticket notifications for all admin pages
  useSupportTicketNotifications();
  
  // Track staff presence across all admin pages (keeps user "online" when navigating)
  useStaffPresence();
  
  // Use admin-specific PWA manifest
  useAdminManifest();

  useEffect(() => {
    safeStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
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
      <div
        className={cn(
          'fixed flex bg-background overflow-hidden',
          isChatPage ? 'left-0 right-0 top-0' : 'inset-0'
        )}
        style={
          isChatPage
            ? {
                // Always rely on --vvh (kept up to date by visualViewport)
                height: 'calc(var(--vvh, 1vh) * 100)',
              }
            : undefined
        }
      >
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
              className="p-0 w-[68vw] max-w-[14.5rem] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] [&>button]:hidden shadow-2xl shadow-black/50"
              onPointerDownOutside={() => setMobileOpen(false)}
            >
              <div 
                className="h-full relative"
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  (e.currentTarget as any)._touchStartX = touch.clientX;
                }}
                onTouchEnd={(e) => {
                  const touchStartX = (e.currentTarget as any)._touchStartX;
                  const touchEndX = e.changedTouches[0].clientX;
                  const swipeDistance = touchStartX - touchEndX;
                  
                  // Higher sensitivity: 30px threshold to close (was 50px)
                  if (swipeDistance > 30) {
                    setMobileOpen(false);
                  }
                }}
              >
                {/* Drag Handle - Enhanced visibility with animation */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-0.5 opacity-50 active:opacity-80 transition-opacity">
                  <div className="w-1.5 h-12 bg-muted-foreground/70 rounded-full shadow-sm" />
                </div>
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
            <div className="w-1.5 h-20 bg-gradient-to-b from-primary/20 via-primary/50 to-primary/20 rounded-r-full shadow-lg shadow-primary/30 transition-all duration-300 hover:w-2 hover:bg-primary/60 active:scale-x-150 active:bg-primary/80 animate-pulse">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-28 -ml-1" />
            </div>
          </div>
        )}
        <div className="flex-1 flex flex-col min-h-0">
          {isMobile && (
            <header className="sticky top-0 shrink-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] flex items-center justify-between">
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
          
          <main
            className={cn(
              'flex-1 min-h-0 bg-background',
              isChatPage ? 'overflow-hidden overscroll-none' : 'overflow-y-auto overscroll-contain'
            )}
          >
            <div
              className={cn(
                isChatPage
                  ? 'h-full p-0'
                  : 'h-full p-4 md:p-6 lg:p-8 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-[calc(1.5rem+env(safe-area-inset-bottom))]'
              )}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
