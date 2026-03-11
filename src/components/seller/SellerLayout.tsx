import { ReactNode, useLayoutEffect } from 'react';
import { PageTransition } from '@/components/layout/PageTransition';
import { useIsInsideHub } from '@/components/admin/AdminHubContext';
import { Navigate, useLocation } from 'react-router-dom';
import { SellerSidebar } from './SellerSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useMarketplaceAccess } from '@/hooks/useFeatureFlag';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { useIOSChatKeyboard } from '@/hooks/useIOSChatKeyboard';

interface SellerLayoutProps {
  children: ReactNode;
}

export function SellerLayout({ children }: SellerLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { isSeller: isApprovedSeller, loading: sellerLoading } = useSellerStatus();
  const { hasAccess, loading: flagLoading } = useMarketplaceAccess();
  const { isSeller: hasSellerRole, loading: roleLoading } = useAdminAuth();
  const location = useLocation();

  // Detect chat/messaging pages for iOS keyboard handling
  const isChatPage = location.pathname === '/seller/messages' || location.pathname === '/seller/support';

  // iOS PWA keyboard handling
  useIOSChatKeyboard(isChatPage);

  // iOS PWA: Lock document scroll on chat pages to prevent rubber-banding
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

  // Wait for ALL async sources before making any access decisions
  const loading = authLoading || sellerLoading || flagLoading || roleLoading;
  const canAccessSellerDashboard = hasSellerRole || isApprovedSeller;
  const canAccessMarketplace = hasAccess || isApprovedSeller;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!canAccessMarketplace) return <Navigate to="/" replace />;
  if (!canAccessSellerDashboard) return <Navigate to="/account" replace />;

  return (
    <LayoutShell
      desktopSidebar={
        <SellerSidebar collapsed={false} onToggle={() => {}} className="hidden md:flex" />
      }
      mobileSidebar={(onClose) => (
        <SellerSidebar
          collapsed={false}
          onToggle={onClose}
          onNavigate={onClose}
          isMobileDrawer
        />
      )}
      headerProps={{ hideBrandName: true }}
      wrapperClassName={cn(
        'flex w-full bg-background overflow-x-hidden relative',
        isChatPage ? 'flex-col overflow-hidden bg-card' : 'min-h-[100dvh]'
      )}
      mainClassName={cn(
        'flex-1 overflow-x-hidden',
        isChatPage ? 'overflow-y-hidden' : 'overflow-y-auto pb-[env(safe-area-inset-bottom)]'
      )}
      contentClassName="p-4 md:p-6 lg:p-8"
    >
      <PageTransition>{children}</PageTransition>
    </LayoutShell>
  );
}
