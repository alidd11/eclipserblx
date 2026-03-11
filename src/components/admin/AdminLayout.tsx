import { ReactNode, useLayoutEffect } from 'react';
import { PageTransition } from '@/components/layout/PageTransition';
import { useIOSChatKeyboard } from '@/hooks/useIOSChatKeyboard';
import { Navigate, useLocation } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminInstallPrompt } from './AdminInstallPrompt';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSupportTicketNotifications } from '@/hooks/useSupportTicketNotifications';
import { useSellerTicketNotifications } from '@/hooks/useSellerTicketNotifications';
import { useStaffPresence } from '@/hooks/useStaffPresence';
import { useAdminManifest } from '@/hooks/useAdminManifest';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useAdminTextScaling } from '@/hooks/useAdminTextScaling';
import { useIsInsideHub } from './AdminHubContext';
import { LayoutShell } from '@/components/layout/LayoutShell';

interface AdminLayoutProps {
  children: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
}

export function AdminLayout({ children, requiredRoles = [], requiredPermissions = [] }: AdminLayoutProps) {
  const isInsideHub = useIsInsideHub();
  const { user, isStaff, isAdmin, hasRole, loading } = useAdminAuth();
  const { hasAnyPermission, isLoading: permissionsLoading } = useUserPermissions();
  const location = useLocation();
  const isChatPage =
    location.pathname.startsWith('/admin/admin-chat') ||
    location.pathname.startsWith('/admin/staff-messages') ||
    location.pathname.startsWith('/admin/live-chat');

  // iOS PWA: lock document scroll on chat pages to prevent rubber-banding
  useLayoutEffect(() => {
    if (!isChatPage) return;

    const html = document.documentElement;
    const body = document.body;

    const prev = {
      html: { backgroundColor: html.style.backgroundColor, overflow: html.style.overflow, overflowX: html.style.overflowX },
      body: { backgroundColor: body.style.backgroundColor, overflow: body.style.overflow, overflowX: body.style.overflowX },
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

  // iOS PWA keyboard handling for chat pages
  useIOSChatKeyboard(isChatPage);

  // Enable notifications & presence across all admin pages
  useSupportTicketNotifications();
  useSellerTicketNotifications();
  useStaffPresence();
  useAdminManifest();
  useAdminTextScaling();

  const isGateLoading = loading || (!!user?.id && permissionsLoading);

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
        headerProps={{ hideBrandName: true }}
        wrapperClassName={cn(
          'flex w-full bg-background overflow-x-hidden relative max-w-full min-w-0',
          isChatPage ? 'flex-col overflow-hidden bg-card' : 'min-h-[100dvh]'
        )}
        mainClassName={cn(
          'flex-1 overflow-x-hidden max-w-full min-w-0',
          isChatPage ? 'overflow-y-hidden' : 'md:overflow-y-auto pb-[env(safe-area-inset-bottom)]'
        )}
        contentClassName={cn(
          isChatPage
            ? 'flex-1 flex flex-col min-h-0 p-0 pt-[env(safe-area-inset-top)]'
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
