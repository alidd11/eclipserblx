import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AffiliateConnectStatus {
  hasAccount: boolean;
  isOnboarded: boolean;
  canReceivePayments: boolean;
  accountId: string | null;
}

/**
 * Shared hook for affiliate Stripe Connect status.
 * Deduplicates calls across AffiliateCard and Affiliate page.
 */
export function useAffiliateConnectStatus(enabled = true) {
  const { user } = useAuth();

  return useQuery<AffiliateConnectStatus>({
    queryKey: ['affiliate-connect-status', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-affiliate-connect-status');
      if (error) throw error;
      return data as AffiliateConnectStatus;
    },
    enabled: !!user?.id && enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
