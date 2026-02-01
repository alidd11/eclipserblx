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
import { useUserPermissions } from '@/hooks/useUserPermissions';



const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed';

interface AdminLayoutProps {
  children: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
}

export function AdminLayout({ children, requiredRoles = [], requiredPermissions = [] }: AdminLayoutProps) {
  const { user, isStaff, isAdmin, hasRole, loading } = useAdminAuth();
  const { hasAnyPermission, isLoading: permissionsLoading } = useUserPermissions();
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
    // Use the same color for both to ensure safe-area consistency
    const chatBg = 'hsl(var(--card))';
    html.style.backgroundColor = chatBg;
    body.style.backgroundColor = chatBg;

    // Lock document scroll to prevent iOS rubber-banding behind our chat.
    // NOTE: Avoid `position: fixed` here because it can interfere with
    // `interactive-widget=resizes-content` (keyboard resize), causing bottom gaps.
    html.style.overflow = 'hidden';
    html.style.overflowX = 'hidden';
    body.style.overflow = 'hidden';
    body.style.overflowX = 'hidden';

    return () => {
      // Restore prior styles (fallback to theme background if previously unset)
      const themeBg = 'hsl(var(--background))';
      html.style.backgroundColor = prev.html.backgroundColor || themeBg;
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

      body.style.backgroundColor = prev.body.backgroundColor || themeBg;
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

  // Manage `--chat-safe-bottom` and `--chat-vvh` for iOS PWA keyboard handling.
  // On iOS PWA, we need to explicitly set container height based on visualViewport
  // because 100dvh doesn't always update correctly when the keyboard animates.
  useEffect(() => {
    const html = document.documentElement;

    // Cleanup immediately if we're not on a chat page
    if (!isChatPage) {
      html.style.removeProperty('--chat-safe-bottom');
      html.style.removeProperty('--chat-vvh');
      delete html.dataset.chatKeyboard;
      return;
    }

    // Start with safe-area padding (keyboard closed state)
    html.style.setProperty('--chat-safe-bottom', 'calc(env(safe-area-inset-bottom) + 4px)');
    html.style.setProperty('--chat-vvh', '100dvh');
    html.dataset.chatKeyboard = 'closed';

    let disposed = false;
    let baseVvHeight = window.visualViewport?.height ?? window.innerHeight;
    let timers: number[] = [];

    const updateViewport = () => {
      if (disposed) return;

      const vv = window.visualViewport;
      const vvHeight = vv?.height ?? window.innerHeight;

      // Check if any input is focused
      const activeEl = document.activeElement;
      const isInputFocused =
        !!activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      // Update baseline when keyboard is closed (no input focused)
      if (!isInputFocused) {
        baseVvHeight = Math.max(baseVvHeight, vvHeight);
      }

      // Detect keyboard open: significant height reduction while input focused
      const keyboardHeight = Math.max(0, baseVvHeight - vvHeight);
      const keyboardOpen = isInputFocused && keyboardHeight > 80;

      // Set the visual viewport height as a CSS variable for the chat container
      // This ensures the container shrinks when the keyboard opens on iOS PWA
      html.style.setProperty('--chat-vvh', `${vvHeight}px`);

      // When keyboard is open, add a small padding (8px) to prevent the iOS keyboard
      // accessory bar from overlapping the input. When closed, use safe-area inset
      // to fill the home indicator region.
      html.style.setProperty(
        '--chat-safe-bottom',
        keyboardOpen ? '8px' : 'calc(env(safe-area-inset-bottom) + 4px)'
      );
      html.dataset.chatKeyboard = keyboardOpen ? 'open' : 'closed';
    };

    // Staggered updates for reliable first-open detection
    const updateStaggered = () => {
      timers.forEach(t => clearTimeout(t));
      updateViewport();
      timers = [
        window.setTimeout(updateViewport, 50),
        window.setTimeout(updateViewport, 150),
        window.setTimeout(updateViewport, 300),
        window.setTimeout(updateViewport, 500),
      ];
    };

    updateStaggered();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', updateViewport);
    vv?.addEventListener('scroll', updateViewport);
    document.addEventListener('focusin', updateStaggered);
    document.addEventListener('focusout', updateStaggered);

    return () => {
      disposed = true;
      timers.forEach(t => clearTimeout(t));
      vv?.removeEventListener('resize', updateViewport);
      vv?.removeEventListener('scroll', updateViewport);
      document.removeEventListener('focusin', updateStaggered);
      document.removeEventListener('focusout', updateStaggered);

      html.style.removeProperty('--chat-safe-bottom');
      html.style.removeProperty('--chat-vvh');
      delete html.dataset.chatKeyboard;
    };
  }, [isChatPage]);

  // Note: We rely on 100dvh + interactive-widget=resizes-content (set in index.html)
  // to handle iOS keyboard resizing. No custom --chat-vvh logic needed.

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
  

  useEffect(() => {
    safeStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const gateNeedsPermissions = requiredPermissions.length > 0 && !!user?.id && !isAdmin;
  const isGateLoading = loading || (gateNeedsPermissions && permissionsLoading);

  if (isGateLoading) {
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

  // Check required permissions
  if (requiredPermissions.length > 0 && !isAdmin) {
    const hasRequiredPermission = hasAnyPermission(requiredPermissions);
    if (!hasRequiredPermission) {
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
      {/* 
        For chat pages, use --chat-vvh (set by JS based on visualViewport.height)
        to ensure the container shrinks correctly when the iOS keyboard opens.
        This is more reliable than 100dvh on iOS PWA.
      */}
      <div
        className={cn(
          'flex w-full max-w-full min-w-0',
          isChatPage
            ? 'flex-row overflow-hidden bg-card'
            : 'min-h-screen bg-background'
        )}
        style={isChatPage ? { height: 'var(--chat-vvh, 100dvh)' } : undefined}
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
          <Sheet 
            open={mobileOpen} 
            onOpenChange={setMobileOpen}
          >
            <SheetContent 
              side="left" 
              className="!h-[100dvh] !max-h-[100dvh] p-0 w-[68vw] max-w-[14.5rem] pt-[env(safe-area-inset-top)] pb-0 [&>button]:hidden shadow-2xl shadow-black/50 bg-sidebar border-0"
              style={{ height: '100dvh', maxHeight: '100dvh' }}
              onPointerDownOutside={() => setMobileOpen(false)}
            >
              <div 
                className="h-full relative bg-sidebar"
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
          {isMobile && !isChatPage && (
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
              'flex-1 flex flex-col min-w-0 max-w-full min-h-0',
              isChatPage ? 'overflow-hidden overscroll-none bg-card' : 'bg-background'
            )}
          >
            <div
              className={cn(
                'min-w-0 max-w-full',
                isChatPage
                  ? 'flex-1 flex flex-col min-h-0 p-0 pt-[env(safe-area-inset-top)]'
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
