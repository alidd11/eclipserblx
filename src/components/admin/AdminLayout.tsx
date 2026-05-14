import { ReactNode, useState, useEffect, useLayoutEffect } from 'react';
import { PageTransition } from '@/components/layout/PageTransition';
import { useIOSChatKeyboard } from '@/hooks/useIOSChatKeyboard';
import { useDevice } from '@/hooks/useDevice';
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
import { useAdminScrollRestoration } from '@/hooks/useAdminScrollRestoration';
import { AdminCommandSearch } from './AdminCommandSearch';
import { useIsInsideHub } from './AdminHubContext';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { EclipseLogo } from '@/components/ui/EclipseLogo';
import { AdminErrorBoundary } from './AdminErrorBoundary';
import { supabase } from '@/integrations/supabase/client';

/** Decode a JWT payload without verifying signature */
function decodeJwtPayloadSafe(token: string | undefined | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const norm = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = norm.padEnd(Math.ceil(norm.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/**
 * Purge a stale Supabase session from localStorage if its JWT lacks `sub`.
 * This is the root cause of the "white screen / bad_jwt" loop seen in auth-logs:
 * an installed PWA holds a token from a previous deploy that no longer validates.
 */
function purgeStaleAdminSessionOnce(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      let parsed: any;
      try { parsed = JSON.parse(raw); } catch { continue; }
      const access = parsed?.access_token ?? parsed?.currentSession?.access_token;
      const payload = decodeJwtPayloadSafe(access);
      if (payload && typeof payload.sub === 'string' && payload.sub.length > 0) return false;
      // Stale: purge
      localStorage.removeItem(key);
      console.warn('[AdminLayout] Purged stale Supabase session (missing sub claim)');
      // Best-effort sign-out as well
      void supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

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
    location.pathname.startsWith('/admin/messages') ||
    location.pathname.startsWith('/admin/live-chat') ||
    location.pathname.startsWith('/admin/customer-tickets/');
  
  const isImmersivePage = false; // Reserved for future use

  const { isStandalone } = useDevice();
  const [isRefreshing, setIsRefreshing] = useState(false);

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
  useAdminScrollRestoration();

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
        desktopSidebar={null}
        mobileSidebar={(onClose) => (
          <AdminSidebar
            collapsed={false}
            onToggle={onClose}
            onNavigate={onClose}
            isMobileDrawer
          />
        )}
        customHeader={(onMenuClick) => (
          isImmersivePage ? (
            <div
              className="w-full bg-transparent"
              style={{ height: 'env(safe-area-inset-top, 0px)' }}
            />
          ) : (
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
          )
        )}
        showFooter={false}
        showFABs={false}
        chatMode={isChatPage}
        wrapperClassName={cn(
          'flex w-full bg-background overflow-x-hidden relative max-w-full min-w-0',
          isChatPage ? 'flex-col md:flex-row overflow-hidden bg-card' : 'min-h-[100dvh]'
        )}
        wrapperStyle={chatWrapperStyle}
        innerClassName={cn(
          'flex-1 flex flex-col min-w-0',
          isChatPage && 'min-h-0 max-h-[var(--chat-vvh,100dvh)] overflow-hidden'
        )}
        mainStyle={isChatPage ? { paddingBottom: 0, flex: '1 1 0%', minHeight: 0 } : undefined}
        mainClassName={cn(
          'flex-1 overflow-x-hidden max-w-full min-w-0',
          isChatPage ? 'overflow-y-hidden flex flex-col min-h-0' : 'md:overflow-y-auto'
        )}
        contentClassName={cn(
          isChatPage
            ? 'flex-1 flex flex-col min-h-0 overflow-hidden p-0'
            : isImmersivePage
              ? 'p-0'
              : 'p-3 md:p-6 lg:p-8'
        )}
        extra={<><AdminInstallPrompt /><AdminCommandSearch /></>}
      >
        <PageTransition className={isChatPage ? 'flex-1 flex flex-col min-h-0 overflow-hidden' : undefined}>
          {children}
        </PageTransition>
      </LayoutShell>
    </TooltipProvider>
  );
}
