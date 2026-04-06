import { ReactNode, useState, useEffect, useLayoutEffect } from 'react';
import { PageTransition } from '@/components/layout/PageTransition';
import { useIsInsideHub } from '@/components/admin/AdminHubContext';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { SellerSidebar } from './SellerSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useMarketplaceAccess } from '@/hooks/useFeatureFlag';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useSellerOnboarding } from '@/hooks/useSellerOnboarding';
import { Loader2, Menu, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { useIOSChatKeyboard } from '@/hooks/useIOSChatKeyboard';
import { useDevice } from '@/hooks/useDevice';
import { EclipseLogo } from '@/components/ui/EclipseLogo';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';

interface SellerLayoutProps {
  children: ReactNode;
}

export function SellerLayout({ children }: SellerLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { isSeller: isApprovedSeller, loading: sellerLoading } = useSellerStatus();
  const { hasAccess, loading: flagLoading } = useMarketplaceAccess();
  const { isSeller: hasSellerRole, loading: roleLoading } = useAdminAuth();
  const { isOnboardingNeeded, isLoading: onboardingLoading } = useSellerOnboarding();
  const location = useLocation();

  // Detect chat/messaging pages for iOS keyboard handling
  const isChatPage = location.pathname === '/seller/messages' || location.pathname === '/seller/support';

  const { isStandalone } = useDevice();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // iOS PWA keyboard handling
  useIOSChatKeyboard(isChatPage, {
    closedSafeBottom: 'env(safe-area-inset-bottom)',
    openSafeBottom: '12px',
  });

  // iOS PWA: Lock document scroll on chat pages to prevent rubber-banding
  useLayoutEffect(() => {
    if (!isChatPage) return;

    const html = document.documentElement;
    const body = document.body;

    const prev = {
      html: { backgroundColor: html.style.backgroundColor, overflow: html.style.overflow, overflowX: html.style.overflowX },
      body: { backgroundColor: body.style.backgroundColor, overflow: body.style.overflow, overflowX: body.style.overflowX },
    };

    const chatBg = getComputedStyle(document.documentElement)
      .getPropertyValue('--card').trim();
    const chatBgColor = chatBg ? `hsl(${chatBg})` : '';
    html.style.backgroundColor = chatBgColor;
    body.style.backgroundColor = chatBgColor;
    html.style.overflow = 'hidden';
    html.style.overflowX = 'hidden';
    body.style.overflow = 'hidden';
    body.style.overflowX = 'hidden';

    return () => {
      const themeBg = getComputedStyle(document.documentElement)
        .getPropertyValue('--background').trim();
      const themeBgColor = themeBg ? `hsl(${themeBg})` : '';
      html.style.backgroundColor = prev.html.backgroundColor || themeBgColor;
      html.style.overflow = prev.html.overflow;
      html.style.overflowX = prev.html.overflowX;
      body.style.backgroundColor = prev.body.backgroundColor || themeBgColor;
      body.style.overflow = prev.body.overflow;
      body.style.overflowX = prev.body.overflowX;
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

  const chatWrapperStyle = isChatPage
    ? {
        height: 'var(--chat-vvh, 100dvh)',
        minHeight: 'var(--chat-vvh, 100dvh)',
      }
    : undefined;

  // Wait for ALL async sources before making any access decisions
  const loading = authLoading || sellerLoading || flagLoading || roleLoading || onboardingLoading;
  const canAccessSellerDashboard = hasSellerRole || isApprovedSeller;
  const canAccessMarketplace = hasAccess || isApprovedSeller;

  const isInsideHub = useIsInsideHub();

  // When rendered inside a hub tab, skip the full layout chrome
  if (isInsideHub) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background safe-area-page">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!canAccessMarketplace) return <Navigate to="/" replace />;
  if (!canAccessSellerDashboard) return <Navigate to="/account" replace />;

  // Redirect to setup if onboarding is incomplete (only from main dashboard)
  if (isOnboardingNeeded && location.pathname === '/seller') {
    return <Navigate to="/seller/setup" replace />;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <LayoutShell
        desktopSidebar={null}
        mobileSidebar={(onClose) => (
          <SellerSidebar
            collapsed={false}
            onToggle={onClose}
            onNavigate={onClose}
            isMobileDrawer
          />
        )}
        customHeader={(onMenuClick) => (
          <header className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-card px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon" aria-label="Menu"
                className="shrink-0"
                onClick={onMenuClick}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <EclipseLogo size="sm" />
              <span className="font-display font-bold text-sm">Seller Dashboard</span>
            </div>
            <div className="flex items-center gap-1">
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
            </div>
          </header>
        )}
        
        showFooter={false}
        showFABs={false}
        wrapperClassName={cn(
          'flex w-full bg-background overflow-x-hidden relative max-w-full min-w-0',
          isChatPage ? 'flex-col md:flex-row overflow-hidden bg-card' : 'min-h-[100dvh]'
        )}
        wrapperStyle={chatWrapperStyle}
        innerClassName={isChatPage ? 'flex-1 flex flex-col min-w-0 min-h-0' : undefined}
        mainStyle={isChatPage ? { paddingBottom: 0 } : undefined}
        mainClassName={cn(
          'flex-1 overflow-x-hidden max-w-full min-w-0',
          isChatPage ? 'overflow-y-hidden flex flex-col' : 'md:overflow-y-auto'
        )}
        contentClassName={cn(
          isChatPage
            ? 'flex-1 flex flex-col min-h-0 p-0'
            : 'p-4 md:p-6 lg:p-8'
        )}
      >
        {/* fixedHeaderSpacer is auto-handled by LayoutShell — no manual spacer needed */}
        <PageTransition className={isChatPage ? 'flex-1 flex flex-col min-h-0 overflow-hidden' : undefined}>
          {children}
        </PageTransition>
      </LayoutShell>
    </TooltipProvider>
  );
}
