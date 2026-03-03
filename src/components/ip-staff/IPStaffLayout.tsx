import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { IPStaffSidebar } from './IPStaffSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Loader2 } from 'lucide-react';
import { LayoutShell } from '@/components/layout/LayoutShell';

interface IPStaffLayoutProps {
  children: ReactNode;
}

export function IPStaffLayout({ children }: IPStaffLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasPermission, isLoading: permLoading } = useUserPermissions();

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

  const isAdminBypass = user.email === 'alicanimir1@gmail.com';
  if (!isAdminBypass && !hasPermission('ip_shield_staff')) {
    return <Navigate to="/" replace />;
  }

  return (
    <LayoutShell
      desktopSidebar={
        <IPStaffSidebar collapsed={false} onToggle={() => {}} className="hidden md:flex" />
      }
      mobileSidebar={(onClose) => (
        <IPStaffSidebar
          collapsed={false}
          onToggle={onClose}
          onNavigate={onClose}
          isMobileDrawer
        />
      )}
      headerProps={{ hideBrandName: true }}
      contentClassName="p-4 md:p-6 lg:p-8"
    >
      {children}
    </LayoutShell>
  );
}
