import { ReactNode, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
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
import { useSellerTicketNotifications } from '@/hooks/useSellerTicketNotifications';
import { useStaffPresence } from '@/hooks/useStaffPresence';
import { useAdminManifest } from '@/hooks/useAdminManifest';
import { useStaffTheme } from '@/hooks/useStaffTheme';

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
    location.pathname === '/admin/admin-chat' || location.pathname === '/admin/staff-messages' || location.pathname === '/admin/live-chat';

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
  // the html/body background is what shows through. For chat pages we lock the document and match the
  // background to the chat surface.
  //
  // IMPORTANT: We must *restore* the previous inline styles when leaving chat pages.
  // Removing properties can accidentally wipe the global theme background set elsewhere.
  useLayoutEffect(() => {
    if (!isChatPage) return;

    const html = document.documentElement;
    const body = document.body;

    const prev = {
      html: {
        backgroundColor: html.style.backgroundColor,
        overflow: html.style.overflow,
        overflowX: html.style.overflowX,
        position: html.style.position,
        top: html.style.top,
        bottom: html.style.bottom,
        left: html.style.left,
        right: html.style.right,
        width: html.style.width,
        height: html.style.height,
        maxWidth: html.style.maxWidth,
      },
      body: {
        backgroundColor: body.style.backgroundColor,
        overflow: body.style.overflow,
        overflowX: body.style.overflowX,
        position: body.style.position,
        top: body.style.top,
        bottom: body.style.bottom,
        left: body.style.left,
        right: body.style.right,
        width: body.style.width,
        height: body.style.height,
        maxWidth: body.style.maxWidth,
      },
    };

    // Match chat surface behind safe-areas to avoid "grey strip" flashes
    html.style.backgroundColor = 'hsl(var(--card))';
    body.style.backgroundColor = 'hsl(var(--card))';

    // Lock document scroll to prevent iOS auto-scroll / rubber-banding behind our fixed chat shell
    html.style.overflow = 'hidden';
    html.style.overflowX = 'hidden';
    html.style.position = 'fixed';
    html.style.top = '0';
    html.style.bottom = '0';
    html.style.left = '0';
    html.style.right = '0';
    html.style.width = '100%';
    html.style.height = '100%';
    html.style.maxWidth = '100%';

    body.style.overflow = 'hidden';
    body.style.overflowX = 'hidden';
    body.style.position = 'fixed';
    body.style.top = '0';
    body.style.bottom = '0';
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.height = '100%';
    body.style.maxWidth = '100%';

    return () => {
      // Restore prior styles (fallback to theme background if previously unset)
      html.style.backgroundColor = prev.html.backgroundColor || 'hsl(var(--background))';
      html.style.overflow = prev.html.overflow;
      html.style.overflowX = prev.html.overflowX;
      html.style.position = prev.html.position;
      html.style.top = prev.html.top;
      html.style.bottom = prev.html.bottom;
      html.style.left = prev.html.left;
      html.style.right = prev.html.right;
      html.style.width = prev.html.width;
      html.style.height = prev.html.height;
      html.style.maxWidth = prev.html.maxWidth;

      body.style.backgroundColor = prev.body.backgroundColor || 'hsl(var(--background))';
      body.style.overflow = prev.body.overflow;
      body.style.overflowX = prev.body.overflowX;
      body.style.position = prev.body.position;
      body.style.top = prev.body.top;
      body.style.bottom = prev.body.bottom;
      body.style.left = prev.body.left;
      body.style.right = prev.body.right;
      body.style.width = prev.body.width;
      body.style.height = prev.body.height;
      body.style.maxWidth = prev.body.maxWidth;
    };
  }, [isChatPage]);

  // Keep a CSS var in sync with the *visual* viewport height.
  // iOS PWA/Safari can keep `position: fixed` anchored to the layout viewport,
  // which makes chat UIs not move up with the keyboard.
  // We use this var to size the fixed admin shell so it truly shrinks when the keyboard opens.
  //
  // iOS PWA is notoriously flaky about firing visualViewport events when the keyboard closes,
  // so for chat pages we also run a lightweight sync loop.
  // Keep a CSS var in sync with the *visual* viewport height (chat pages only).
  //
  // IMPORTANT: This is intentionally scoped to chat pages.
  // If `--vvh` ever gets stuck at a reduced value (iOS keyboard quirks), it can leave a visible
  // “grey strip” at the bottom of non-chat admin pages. Limiting this logic prevents that.
  useEffect(() => {
    const html = document.documentElement;

    // Hard reset whenever we are NOT on a chat page (extra safety)
    if (!isChatPage) {
      html.style.removeProperty('--vvh');
      html.style.removeProperty('--chat-safe-bottom');
      delete html.dataset.chatKeyboard;
      return;
    }

    // IMMEDIATELY set --vvh on mount to prevent layout jump
    html.style.setProperty('--vvh', `${window.innerHeight}px`);

    // IMPORTANT: We schedule multiple setTimeout passes to handle iOS keyboard animation.
    // If those timeouts fire after navigating away, they can re-apply --vvh and cause the
    // bottom “grey strip” to persist on non-chat pages. Track + cancel everything.
    let disposed = false;
    let rafId = 0;
    const timeoutIds: number[] = [];

    const schedule = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        if (!disposed) fn();
      }, ms);
      timeoutIds.push(id);
    };

    const clearScheduled = () => {
      timeoutIds.forEach((id) => window.clearTimeout(id));
      timeoutIds.length = 0;
    };

    const setVars = () => {
      if (disposed) return;

      // ALWAYS get fresh visualViewport reference - it can change
      const vv = window.visualViewport;
      const vvHeight = vv?.height ?? window.innerHeight;
      const vvOffsetTop = vv?.offsetTop ?? 0;
      const innerH = window.innerHeight;

      // Check if any input is currently focused
      const activeEl = document.activeElement;
      const isInputFocused =
        !!activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      // Detect if keyboard is likely open:
      // 1. Significant difference between layout and visual viewport
      // 2. AND an input element is focused
      // 3. OR visualViewport has a non-zero offsetTop (iOS quirk)
      const keyboardOpen =
        isInputFocused && (Math.abs(innerH - vvHeight) > 50 || vvOffsetTop > 10);

      // When keyboard is open, use visualViewport (minus offsetTop for iOS scroll offset);
      // when closed, ALWAYS use innerHeight to ensure full recovery
      const height = keyboardOpen ? vvHeight - vvOffsetTop : innerH;
      html.style.setProperty('--vvh', `${height}px`);

      // Clamp safe-bottom while the keyboard is open.
      html.style.setProperty(
        '--chat-safe-bottom',
        keyboardOpen ? '0px' : 'env(safe-area-inset-bottom)'
      );
      html.dataset.chatKeyboard = keyboardOpen ? 'open' : 'closed';
    };

    // Force iOS to recalculate viewport by triggering a tiny scroll + reflow
    const forceViewportRecalc = () => {
      window.scrollTo(0, 0);
      void document.documentElement.offsetHeight;
    };

    const sync = () => {
      if (disposed) return;

      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (disposed) return;

        setVars();
        // Run a few delayed passes to catch iOS keyboard animation + late viewport settling
        schedule(setVars, 50);
        schedule(setVars, 150);
        schedule(setVars, 300);
        schedule(setVars, 500);
      });
    };

    // Aggressive recovery on blur - when input loses focus, immediately reset to full height
    const handleBlur = () => {
      if (disposed) return;

      forceViewportRecalc();

      const recoverHeight = () => {
        if (disposed) return;

        const activeEl = document.activeElement;
        const isInputFocused =
          !!activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            (activeEl as HTMLElement).isContentEditable);

        if (!isInputFocused) {
          forceViewportRecalc();
          html.style.setProperty('--vvh', `${window.innerHeight}px`);
          html.style.setProperty('--chat-safe-bottom', 'env(safe-area-inset-bottom)');
          html.dataset.chatKeyboard = 'closed';
        }
      };

      schedule(recoverHeight, 50);
      schedule(recoverHeight, 100);
      schedule(recoverHeight, 200);
      schedule(recoverHeight, 350);
      schedule(recoverHeight, 500);

      sync();
    };

    sync();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    document.addEventListener('focusin', sync);
    document.addEventListener('focusout', handleBlur);

    // Extra hardening for chat pages: poll frequently to ensure --vvh recovers after keyboard close
    const interval = window.setInterval(() => {
      if (disposed) return;

      setVars();

      const activeEl = document.activeElement;
      const isInputFocused =
        !!activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if (!isInputFocused) {
        const currentVvh = parseInt(html.style.getPropertyValue('--vvh') || '0', 10);
        if (currentVvh > 0 && currentVvh < window.innerHeight - 20) {
          forceViewportRecalc();
          html.style.setProperty('--vvh', `${window.innerHeight}px`);
          html.style.setProperty('--chat-safe-bottom', 'env(safe-area-inset-bottom)');
          html.dataset.chatKeyboard = 'closed';
        }
      }
    }, 100);

    return () => {
      disposed = true;

      cancelAnimationFrame(rafId);
      clearScheduled();
      window.clearInterval(interval);

      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      document.removeEventListener('focusin', sync);
      document.removeEventListener('focusout', handleBlur);

      // Ensure complete cleanup - remove all chat-related CSS variables
      html.style.removeProperty('--vvh');
      html.style.removeProperty('--chat-safe-bottom');
      delete html.dataset.chatKeyboard;
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

  const EDGE_SWIPE_ZONE_PX = 100;
  const OPEN_SWIPE_MIN_X = 12;
  const HORIZONTAL_LOCK_RATIO = 1.1;

  // Handle swipe from left edge to open sidebar (high sensitivity, but scroll-safe)
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      // When the drawer is open, do NOT treat touches as an "edge swipe".
      // This prevents us from blocking vertical scrolling inside the sidebar.
      if (mobileOpen) {
        isEdgeSwipe.current = false;
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }

      // Allow exempt UI to receive gestures/taps without sidebar edge-swipe interference
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

      // Mark as edge swipe if starting near left edge (expanded zone)
      isEdgeSwipe.current = touch.clientX < EDGE_SWIPE_ZONE_PX;
    },
    [mobileOpen]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      // Only intercept gestures when the drawer is CLOSED.
      if (mobileOpen) return;
      if (!isEdgeSwipe.current || touchStartX.current === null) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;

      // IMMEDIATELY prevent any rightward movement from the left edge.
      // This stops iOS from interpreting it as a back gesture BEFORE the
      // browser can act on it. We use stopPropagation to be extra safe.
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
  
  // Enable seller ticket notifications for all admin pages
  useSellerTicketNotifications();
  
  // Track staff presence across all admin pages (keeps user "online" when navigating)
  useStaffPresence();
  
  // Use admin-specific PWA manifest
  useAdminManifest();
  
  // Initialize staff theme - the hook applies the theme class to document
  useStaffTheme();

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
          'flex w-full max-w-full min-w-0',
          isChatPage
            ? 'fixed top-0 left-0 right-0 h-[var(--vvh,100dvh)] overflow-hidden bg-card'
            : 'min-h-screen bg-background'
        )}
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
              className="p-0 w-[68vw] max-w-[14.5rem] pt-[env(safe-area-inset-top)] pb-0 [&>button]:hidden shadow-2xl shadow-black/50 bg-card border-0"
              onPointerDownOutside={() => setMobileOpen(false)}
            >
              <div 
                className="h-full relative"
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  (e.currentTarget as any)._touchStartX = touch.clientX;
                  (e.currentTarget as any)._touchStartY = touch.clientY;
                }}
                onTouchEnd={(e) => {
                  const touchStartX = (e.currentTarget as any)._touchStartX as number | undefined;
                  const touchStartY = (e.currentTarget as any)._touchStartY as number | undefined;
                  if (touchStartX == null || touchStartY == null) return;

                  const touchEnd = e.changedTouches[0];
                  const deltaX = touchEnd.clientX - touchStartX;
                  const deltaY = Math.abs(touchEnd.clientY - touchStartY);

                  const swipeLeft = -deltaX;
                  const isMostlyHorizontal = Math.abs(deltaX) > deltaY * 1.1;

                  // Higher sensitivity: 30px threshold to close, but avoid closing on vertical scroll
                  if (swipeLeft > 30 && isMostlyHorizontal) {
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
        
        {/* Main content area */}
        <div 
          className={cn(
            'flex-1 flex flex-col min-w-0 max-w-full',
            isChatPage ? 'h-full overflow-hidden' : ''
          )}
        >
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
              'flex-1 min-w-0 max-w-full',
              isChatPage ? 'overflow-hidden overscroll-none bg-card' : 'bg-background'
            )}
          >
            <div
              className={cn(
                'min-w-0 max-w-full',
                isChatPage
                  ? 'h-full p-0'
                  : 'p-4 md:p-6 lg:p-8 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-[calc(1.5rem+env(safe-area-inset-bottom))]'
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
