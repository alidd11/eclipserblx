import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PUBLIC_STORE_COLUMNS } from '@/lib/storeColumns';

const CURRENT_TOS_VERSION = "1.0";

/**
 * Centralised hook for fetching a public store by slug.
 * 
 * Ensures consistent access rules across ALL public store pages:
 * - is_active = true
 * - status = 'approved'
 * - Valid seller_agreements signature
 * 
 * Uses a shared React Query cache key so navigating between
 * store sub-pages (about, reviews, custom pages) reuses cached data.
 */
export function usePublicStore(slug: string | undefined) {
  const query = useQuery({
    queryKey: ['public-store', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select(PUBLIC_STORE_COLUMNS)
        .eq('slug', slug!)
        .eq('is_active', true)
        .eq('status', 'approved')
        .single();

      if (error) throw error;

      // Verify store has signed the current ToS
      const { data: agreement } = await supabase
        .from('seller_agreements')
        .select('id')
        .eq('store_id', data.id)
        .eq('agreement_version', CURRENT_TOS_VERSION)
        .maybeSingle();

      if (!agreement) throw new Error('Store agreement not signed');

      return data;
    },
    enabled: !!slug,
  });

  return {
    store: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    notFound: !query.isLoading && !query.data,
  };
}
