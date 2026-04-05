import { ReactNode, useState, useEffect, useLayoutEffect } from 'react';
import { PageTransition } from '@/components/layout/PageTransition';
import { useIOSChatKeyboard } from '@/hooks/useIOSChatKeyboard';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminInstallPrompt } from './AdminInstallPrompt';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2, Menu, RefreshCw } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSupportTicketNotifications } from '@/hooks/useSupportTicketNotifications';
import { useSellerTicketNotifications } from '@/hooks/useSellerTicketNotifications';
import { useStaffPresence } from '@/hooks/useStaffPresence';
import { useAdminManifest } from '@/hooks/useAdminManifest';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useAdminTextScaling } from '@/hooks/useAdminTextScaling';
import { useIsInsideHub } from './AdminHubContext';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { EclipseLogo } from '@/components/ui/EclipseLogo';

interface AdminLayoutProps {
  children: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
}

export function AdminLayout({ children, requiredRoles = [], requiredPermissions = [] }: AdminLayoutProps) {
  const isInsideHub = useIsInsideHub();
  const { user, isStaff, isAdmin, hasRole, loading, isAuthRecovering, isAuthExpired } = useAdminAuth();
  const permissionsRequired = requiredPermissions.length > 0 && !isAdmin;
  const { hasAnyPermission, isLoading: permissionsLoading, isAuthExpired: permAuthExpired } = useUserPermissions({ enabled: permissionsRequired });
  const location = useLocation();
  const isChatPage =
    location.pathname.startsWith('/admin/admin-chat') ||
    location.pathname.startsWith('/admin/staff-messages') ||
    location.pathname.startsWith('/admin/live-chat') ||
    location.pathname.startsWith('/admin/customer-tickets/');
  
  const isImmersivePage =
    location.pathname === '/admin/twitter-posts';

  const [isStandalone, setIsStandalone] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if running as PWA
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
  }, []);

  // iOS PWA: lock document scroll on chat pages to prevent rubber-banding
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

  // iOS PWA keyboard handling for chat pages
  useIOSChatKeyboard(isChatPage, {
    closedSafeBottom: 'env(safe-area-inset-bottom)',
    openSafeBottom: '12px',
  });

  // Enable notifications & presence across all admin pages
  useSupportTicketNotifications();
  useSellerTicketNotifications();
  useStaffPresence();
  useAdminManifest();
  useAdminTextScaling();

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

  const isGateLoading = loading || (!!user?.id && permissionsRequired && permissionsLoading) || isAuthRecovering;

  // Show loading spinner (bounded — will not hang forever)
  if (isGateLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background safe-area-page">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Session expired after exhausting retries — show actionable prompt instead of spinner
  if (isAuthExpired || permAuthExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background safe-area-page">
        <div className="text-center space-y-4 p-6">
          <h1 className="text-2xl font-display font-bold">Session Expired</h1>
          <p className="text-muted-foreground">Your session has expired. Please sign in again.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button asChild className="gradient-button border-0">
              <Link to="/admin/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background safe-area-page">
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
        <div className="min-h-screen flex items-center justify-center bg-background safe-area-page">
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
        <div className="min-h-screen flex items-center justify-center bg-background safe-area-page">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-display font-bold">Access Denied</h1>
            <p className="text-muted-foreground">You don't have the required permissions for this page.</p>
          </div>
        </div>
      );
    }
  }

  // When rendered inside a hub page, skip layout chrome
  if (isInsideHub) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <LayoutShell
        desktopSidebar={
          <AdminSidebar collapsed={false} onToggle={() => {}} />
        }
        mobileSidebar={(onClose) => (
          <AdminSidebar
            collapsed={false}
            onToggle={onClose}
            onNavigate={onClose}
            isMobileDrawer
          />
        )}
        customHeader={(onMenuClick) => (
          isImmersivePage ? null : (
            <>
              <header className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-card px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 md:hidden"
                    onClick={onMenuClick}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                  <EclipseLogo size="sm" />
                  <span className="font-display font-bold text-sm">Admin Dashboard</span>
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
              {/* Spacer to prevent content from hiding behind the fixed header */}
              <div className="h-[calc(env(safe-area-inset-top)+3rem)]" />
            </>
          )
        )}
        showBreadcrumb={false}
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
            : isImmersivePage
              ? 'p-0'
              : 'p-4 md:p-6 lg:p-8 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-[calc(1.5rem+env(safe-area-inset-bottom))]'
        )}
        extra={<AdminInstallPrompt />}
      >
        <PageTransition className={isChatPage ? 'flex-1 flex flex-col min-h-0 overflow-hidden' : undefined}>
          {children}
        </PageTransition>
      </LayoutShell>
    </TooltipProvider>
  );
}
