import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface IdentityVerificationStatus {
  verified: boolean;
  status: string;
  verifiedAt?: string;
  verifiedName?: string;
  verifiedEmail?: string;
  verifiedAddress?: string;
}

const ADMIN_TEST_EMAILS = ['alicanimir1@gmail.com'];

/**
 * Shared hook for identity verification status.
 * DB-first: reads from identity_verifications table for already-verified users.
 * Only calls the edge function for pending/unverified users who need Stripe sync.
 */
export function useIdentityVerification(enabled = true) {
  const { user } = useAuth();

  return useQuery<IdentityVerificationStatus>({
    queryKey: ['ip-shield-identity-verification', user?.id],
    queryFn: async (): Promise<IdentityVerificationStatus> => {
      if (!user) return { verified: false, status: 'none' };

      // Admin test override
      if (user.email && ADMIN_TEST_EMAILS.includes(user.email)) {
        return {
          verified: true,
          status: 'verified',
          verifiedAt: new Date().toISOString(),
          verifiedName: user.email.split('@')[0],
          verifiedEmail: user.email,
        };
      }

      // DB-first: check for already-verified record (no edge function needed)
      const { data: verifiedRecord } = await supabase
        .from('identity_verifications')
        .select('id, verified_at, status')
        .eq('user_id', user.id)
        .eq('status', 'verified')
        .limit(1)
        .maybeSingle();

      if (verifiedRecord) {
        return {
          verified: true,
          status: 'verified',
          verifiedAt: verifiedRecord.verified_at,
          verifiedEmail: user.email || '',
        };
      }

      // Check if there are any pending sessions that need Stripe sync
      const { data: pendingSessions } = await supabase
        .from('identity_verifications')
        .select('id, status')
        .eq('user_id', user.id)
        .neq('status', 'verified')
        .limit(1);

      if (!pendingSessions || pendingSessions.length === 0) {
        return { verified: false, status: 'none' };
      }

      // Only call the edge function for pending sessions (needs Stripe API)
      const { data, error } = await supabase.functions.invoke('check-identity-verification');
      if (error) throw error;
      return data as IdentityVerificationStatus;
    },
    enabled: !!user && enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
