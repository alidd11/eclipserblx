import { ReactNode, useState, useCallback, useRef, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { IPStaffSidebar } from './IPStaffSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { hapticTap } from '@/lib/haptics';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { UniversalBreadcrumb } from '@/components/layout/UniversalBreadcrumb';
import { FloatingActionButtons } from '@/components/ui/FloatingActionButtons';
import { ScrollProgressIndicator } from '@/components/ui/ScrollProgressIndicator';

const EDGE_THRESHOLD = 30;
const MIN_SWIPE_DISTANCE = 50;

interface IPStaffLayoutProps {
  children: ReactNode;
}

export function IPStaffLayout({ children }: IPStaffLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasPermission, isLoading: permLoading } = useUserPermissions();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const loading = authLoading || permLoading;

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

  // Admin test email bypass + permission check
  const isAdminBypass = user.email === 'alicanimir1@gmail.com';
  if (!isAdminBypass && !hasPermission('ip_shield_staff')) {
    return <Navigate to="/" replace />;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <ScrollProgressIndicator />
      <div className="flex w-full bg-background overflow-x-hidden relative min-h-[100dvh]">
        <IPStaffSidebar
          collapsed={false}
          onToggle={() => {}}
          className="hidden md:flex"
        />

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="p-0 w-64 border-r-0 !h-[100dvh] !max-h-[100dvh] bg-card overflow-hidden"
            style={{ height: '100dvh', maxHeight: '100dvh' }}
            data-gesture-exempt="true"
            hideCloseButton
          >
            <IPStaffSidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
              isMobileDrawer
            />
          </SheetContent>
        </Sheet>

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
