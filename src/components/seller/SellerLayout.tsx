import { ReactNode, useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { SellerSidebar } from './SellerSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useMarketplaceAccess } from '@/hooks/useFeatureFlag';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { safeStorage } from '@/lib/safeStorage';
import { hapticTap } from '@/lib/haptics';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { FloatingActionButtons } from '@/components/ui/FloatingActionButtons';
import { ScrollProgressIndicator } from '@/components/ui/ScrollProgressIndicator';
import { SearchCommandProvider, useSearchCommand } from '@/hooks/useSearchCommand';
import { SearchCommandPalette } from '@/components/search/SearchCommandPalette';

const EDGE_THRESHOLD = 30;
const MIN_SWIPE_DISTANCE = 50;

interface SellerLayoutProps {
  children: ReactNode;
}

function SellerLayoutContent({ children }: SellerLayoutProps) {
  const searchCommand = useSearchCommand();
  const { user, loading: authLoading } = useAuth();
  const { isSeller: isApprovedSeller, loading: sellerLoading, store } = useSellerStatus();
  const { hasAccess, loading: flagLoading } = useMarketplaceAccess();
  const { isSeller: hasSellerRole, loading: roleLoading } = useAdminAuth();
  const isMobile = useIsMobile();
  const location = useLocation();

  // Detect chat/messaging pages for iOS keyboard handling
  const isChatPage = location.pathname === '/seller/messages' || location.pathname === '/seller/support';

  const [mobileOpen, setMobileOpen] = useState(false);

  // Touch tracking for edge swipe
  const touchStartRef = useRef<{ x: number; y: number; isEdge: boolean } | null>(null);

  // iOS PWA: Lock document scroll on chat pages to prevent rubber-banding
  useLayoutEffect(() => {
    if (!isChatPage) return;

    const html = document.documentElement;
    const body = document.body;

    const prev = {
      html: {
        backgroundColor: html.style.backgroundColor,
        overflow: html.style.overflow,
        overflowX: html.style.overflowX,
      },
      body: {
        backgroundColor: body.style.backgroundColor,
        overflow: body.style.overflow,
        overflowX: body.style.overflowX,
      },
    };

    const chatBg = 'hsl(var(--card))';
    html.style.backgroundColor = chatBg;
    body.style.backgroundColor = chatBg;
    html.style.overflow = 'hidden';
    html.style.overflowX = 'hidden';
    body.style.overflow = 'hidden';
    body.style.overflowX = 'hidden';

    return () => {
      const themeBg = 'hsl(var(--background))';
      html.style.backgroundColor = prev.html.backgroundColor || themeBg;
      html.style.overflow = prev.html.overflow;
      html.style.overflowX = prev.html.overflowX;
      body.style.backgroundColor = prev.body.backgroundColor || themeBg;
      body.style.overflow = prev.body.overflow;
      body.style.overflowX = prev.body.overflowX;
    };
  }, [isChatPage]);

  // iOS PWA: Manage --chat-vvh and --chat-safe-bottom for keyboard handling
  useEffect(() => {
    const html = document.documentElement;

    if (!isChatPage) {
      html.style.removeProperty('--chat-safe-bottom');
      html.style.removeProperty('--chat-vvh');
      delete html.dataset.chatKeyboard;
      return;
    }

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

      const activeEl = document.activeElement;
      const isInputFocused =
        !!activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if (!isInputFocused) {
        baseVvHeight = Math.max(baseVvHeight, vvHeight);
      }

      const keyboardHeight = Math.max(0, baseVvHeight - vvHeight);
      const keyboardOpen = isInputFocused && keyboardHeight > 80;

      html.style.setProperty('--chat-vvh', `${vvHeight}px`);
      html.style.setProperty(
        '--chat-safe-bottom',
        keyboardOpen ? '8px' : 'calc(env(safe-area-inset-bottom) + 4px)'
      );
      html.dataset.chatKeyboard = keyboardOpen ? 'open' : 'closed';
    };

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

  // Handle edge swipe to open drawer
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


  const loading = authLoading || sellerLoading || flagLoading || roleLoading;
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
      <ScrollProgressIndicator />
      <SearchCommandPalette open={searchCommand.open} onOpenChange={searchCommand.setOpen} />
      <div
        className={cn(
          'flex w-full bg-background overflow-x-hidden relative',
          isChatPage ? 'flex-col overflow-hidden bg-card' : 'min-h-[100dvh]'
        )}
        style={isChatPage ? { height: 'var(--chat-vvh, 100dvh)' } : undefined}
      >
        {/* Desktop Sidebar */}
        <SellerSidebar
          collapsed={false}
          onToggle={() => {}}
          className="hidden md:flex"
        />

        {/* Mobile Sidebar Drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="p-0 w-64 border-r-0 !h-[100dvh] !max-h-[100dvh] bg-card overflow-hidden"
            style={{ height: '100dvh', maxHeight: '100dvh' }}
            data-gesture-exempt="true"
            hideCloseButton
          >
            <SellerSidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
              isMobileDrawer
            />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 h-[100dvh]">
          {/* Shared Header from MainLayout */}
          <Header 
            showDesktopNav={false} 
            onMenuClick={() => setMobileOpen(true)} 
          />

          {/* Scrollable Content */}
          <main className={cn(
            "flex-1 overflow-x-hidden",
            isChatPage ? "overflow-y-hidden" : "overflow-y-auto pb-[env(safe-area-inset-bottom)]"
          )}>
            <div className={cn(
              "p-4 md:p-6 lg:p-8",
              isChatPage ? "" : ""
            )}>
              {children}
            </div>
            {!isChatPage && <Footer />}
          </main>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <FloatingActionButtons />
    </TooltipProvider>
  );
}

// Wrapper component that provides the SearchCommandProvider context
export function SellerLayout(props: SellerLayoutProps) {
  return (
    <SearchCommandProvider>
      <SellerLayoutContent {...props} />
    </SearchCommandProvider>
  );
}
