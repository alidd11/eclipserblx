import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { IPShieldSidebar } from './IPShieldSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { LayoutShell } from '@/components/layout/LayoutShell';
import { useIPShieldSubscription } from '@/hooks/useIPShieldSubscription';

interface IPShieldLayoutProps {
  children: ReactNode;
}

export function IPShieldLayout({ children }: IPShieldLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { isStaff, loading: adminLoading } = useAdminAuth();

  // Check subscription via shared hook (DB-first with background Stripe sync)
  const { data: subscriptionStatus, isLoading: subLoading } = useIPShieldSubscription();

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
    <LayoutShell
      desktopSidebar={
        <IPShieldSidebar collapsed={false} onToggle={() => {}} className="hidden md:flex" />
      }
      mobileSidebar={(onClose) => (
        <IPShieldSidebar
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
