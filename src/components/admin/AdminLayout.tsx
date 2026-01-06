import { ReactNode, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';

interface AdminLayoutProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export function AdminLayout({ children, requiredRoles = [] }: AdminLayoutProps) {
  const { user, isStaff, isAdmin, hasRole, loading } = useAdminAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen flex bg-background">
        <AdminSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
