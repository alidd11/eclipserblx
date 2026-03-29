import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAuth } from '@/hooks/useAuth';
import { BotDashboardSidebar } from './BotDashboardSidebar';
import { Menu, X, ArrowLeft } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(228,15%,10%)] flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-8 w-3/4 mx-auto bg-white/10" />
          <Skeleton className="h-4 w-1/2 mx-auto bg-white/10" />
          <Skeleton className="h-64 w-full rounded-lg bg-white/10" />
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[hsl(228,15%,10%)] text-white flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <BotDashboardSidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 h-full">
            <BotDashboardSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top header */}
        <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[hsl(228,15%,12%)] sticky top-0 z-40"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/50 hover:text-white hover:bg-white/10 gap-1.5"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="text-xs text-white/50 hidden sm:block">{user.email}</span>
            )}
            <div className="w-8 h-8 rounded-full bg-[hsl(258,90%,66%)] flex items-center justify-center text-xs font-bold">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
