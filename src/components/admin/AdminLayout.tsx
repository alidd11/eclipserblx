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

  // On iOS PWAs, if *anything* ever renders outside our fixed shell (overscroll/rounding/viewport jitter),
  // the html/body background is what shows through. Force it to match chat pages to prevent grey gaps.
  // ALSO lock document scroll to prevent iOS auto-scroll-to-input behavior.
  useEffect(() => {
    if (!isChatPage) return;

    const html = document.documentElement;
    const body = document.body;

    // Save previous styles
    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlPosition = html.style.position;
    const prevBodyPosition = body.style.position;
    const prevHtmlWidth = html.style.width;
    const prevBodyWidth = body.style.width;

    // Set background color to match chat
    html.style.backgroundColor = 'hsl(var(--card))';
    body.style.backgroundColor = 'hsl(var(--card))';

    // Lock document scroll to prevent iOS from scrolling page when focusing input
    html.style.overflow = 'hidden';
    html.style.position = 'fixed';
    html.style.width = '100%';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.width = '100%';

    return () => {
      html.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
      html.style.overflow = prevHtmlOverflow;
      html.style.position = prevHtmlPosition;
      html.style.width = prevHtmlWidth;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.width = prevBodyWidth;
    };
  }, [isChatPage]);

  // Keep a CSS var in sync with the *visual* viewport height.
  // iOS PWA/Safari can keep `position: fixed` anchored to the layout viewport,
  // which makes chat UIs not move up with the keyboard.
  // We use this var to size the fixed admin shell so it truly shrinks when the keyboard opens.
  //
  // iOS PWA is notoriously flaky about firing visualViewport events when the keyboard closes,
  // so for chat pages we also run a lightweight sync loop.
  useEffect(() => {
    const html = document.documentElement;
    let rafId = 0;

    const setVars = () => {
      // ALWAYS get fresh visualViewport reference - it can change
      const vv = window.visualViewport;
      // Use the LARGER of visualViewport.height and innerHeight when keyboard is closed
      // to prevent getting stuck at keyboard-open height
      const vvHeight = vv?.height ?? window.innerHeight;
      const innerH = window.innerHeight;
      
      // Detect if keyboard is likely open (significant difference between layout and visual viewport)
      const keyboardOpen = Math.abs(innerH - vvHeight) > 100;
      
      // When keyboard is open, use visualViewport; when closed, use the max to recover
      const height = keyboardOpen ? vvHeight : Math.max(vvHeight, innerH);
      html.style.setProperty('--vvh', `${height}px`);
    };

    const sync = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setVars();
        // Run a few delayed passes to catch iOS keyboard animation + late viewport settling
        window.setTimeout(setVars, 50);
        window.setTimeout(setVars, 150);
        window.setTimeout(setVars, 300);
        window.setTimeout(setVars, 500);
      });
    };

    sync();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    document.addEventListener('focusin', sync);
    document.addEventListener('focusout', sync);

    // Extra hardening for chat pages: poll frequently to ensure --vvh recovers after keyboard close
    const interval = isChatPage ? window.setInterval(setVars, 100) : undefined;

    return () => {
      cancelAnimationFrame(rafId);
      if (interval) window.clearInterval(interval);
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      document.removeEventListener('focusin', sync);
      document.removeEventListener('focusout', sync);
      
      // CRITICAL: Reset --vvh to full viewport height when leaving chat pages
      // This prevents the grey gap issue when keyboard was open during navigation
      html.style.removeProperty('--vvh');
    };
  }, [isChatPage]);

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
          'fixed top-0 left-0 right-0 flex overflow-hidden',
          isChatPage ? 'bg-card' : 'bg-background'
        )}
        style={{ height: 'var(--vvh, 100dvh)' }}
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
              className="p-0 w-[68vw] max-w-[14.5rem] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] [&>button]:hidden shadow-2xl shadow-black/50 bg-card border-border"
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
              'flex-1 min-h-0',
              isChatPage ? 'overflow-hidden overscroll-none bg-card' : 'overflow-y-auto overscroll-contain bg-background'
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
