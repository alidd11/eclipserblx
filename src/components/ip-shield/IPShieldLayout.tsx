import { ReactNode, useState, useCallback, useRef, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { IPShieldSidebar } from './IPShieldSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { hapticTap } from '@/lib/haptics';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { UniversalBreadcrumb } from '@/components/layout/UniversalBreadcrumb';
import { FloatingActionButtons } from '@/components/ui/FloatingActionButtons';
import { ScrollProgressIndicator } from '@/components/ui/ScrollProgressIndicator';
import { Skeleton } from '@/components/ui/skeleton';

const EDGE_THRESHOLD = 30;
const MIN_SWIPE_DISTANCE = 50;

interface IPShieldLayoutProps {
  children: ReactNode;
}

export function IPShieldLayout({ children }: IPShieldLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { isStaff, loading: adminLoading } = useAdminAuth();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Touch tracking for edge swipe
  const touchStartRef = useRef<{ x: number; y: number; isEdge: boolean } | null>(null);

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

  useEffect(() => {
    if (!isMobile) return;
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, handleTouchStart, handleTouchEnd]);

  // Check subscription + verification (skip for staff/admins)
  const { data: subscriptionStatus, isLoading: subLoading } = useQuery({
    queryKey: ['ip-shield-subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-ip-shield-subscription');
      if (error) throw error;
      return data as { subscribed: boolean; tier?: string; limits?: any; custom_plan?: boolean };
    },
    enabled: !!user && !isStaff,
  });

  const { data: verificationStatus, isLoading: verifyLoading } = useQuery({
    queryKey: ['ip-shield-identity-verification', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-identity-verification');
      if (error) throw error;
      return data as { verified: boolean; status: string };
    },
    enabled: !!user && !isStaff && subscriptionStatus?.subscribed === true,
  });

  const loading = authLoading || adminLoading || (!isStaff && (subLoading || (subscriptionStatus?.subscribed && verifyLoading)));

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

  // Staff/admins bypass subscription and verification checks
  if (!isStaff) {
    if (!subscriptionStatus?.subscribed) {
      return <Navigate to="/ip-shield" replace />;
    }

    if (!verificationStatus?.verified) {
      return <Navigate to="/ip-shield" replace />;
    }
  }

  return (
    <TooltipProvider delayDuration={0}>
      <ScrollProgressIndicator />
      <div className="flex w-full bg-background overflow-x-hidden relative min-h-[100dvh]">
        {/* Desktop Sidebar */}
        <IPShieldSidebar
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
            <IPShieldSidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
              isMobileDrawer
            />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 h-[100dvh]">
          <Header 
            showDesktopNav={false} 
            hideBrandName
            onMenuClick={() => setMobileOpen(true)} 
          />
          <UniversalBreadcrumb />

          <main className="flex-1 overflow-x-hidden overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            <div className="p-4 md:p-6 lg:p-8">
              {children}
            </div>
            <Footer />
          </main>
        </div>
      </div>
      <FloatingActionButtons />
    </TooltipProvider>
  );
}
