import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAuth } from '@/hooks/useAuth';
import { BotDashboardSidebar } from './BotDashboardSidebar';
import { Menu, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface BotDashboardLayoutProps {
  children: React.ReactNode;
}

export function BotDashboardLayout({ children }: BotDashboardLayoutProps) {
  const { roles, loading } = useAdminAuth();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = roles?.includes('admin');

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/admin/login', { replace: true });
    }
  }, [loading, isAdmin, navigate]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [sidebarOpen]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[hsl(228,15%,10%)] flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-8 w-3/4 mx-auto bg-background/10" />
          <Skeleton className="h-4 w-1/2 mx-auto bg-background/10" />
          <Skeleton className="h-64 w-full rounded-lg bg-background/10" />
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div
      className="h-[100dvh] bg-[hsl(228,15%,10%)] text-foreground flex overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* Desktop sidebar */}
      <div className="hidden lg:flex shrink-0">
        <BotDashboardSidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-64 h-full animate-in slide-in-from-left duration-200">
            <BotDashboardSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top header — sticky within this column */}
        <header
          className="shrink-0 h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[hsl(228,15%,12%)]/95 backdrop-blur-md z-30"
        >
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon" aria-label="Menu"
              className="lg:hidden text-foreground/70 hover:text-foreground hover:bg-background/10"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-foreground/50 hover:text-foreground hover:bg-background/10 gap-1.5"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="text-xs text-foreground/50 hidden sm:block">{user.email}</span>
            )}
            <div className="w-8 h-8 rounded-full bg-[hsl(258,90%,66%)] flex items-center justify-center text-xs font-bold">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        {/* Scrollable page content */}
        <main
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
