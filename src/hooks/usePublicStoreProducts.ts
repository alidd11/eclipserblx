import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Centralised hook for fetching a store's public products.
 *
 * Consistent access rules:
 * - is_active = true
 * - moderation_status = 'approved'
 * - Ordered by created_at desc
 *
 * Shared cache key: ['store-products', storeId]
 */
export function usePublicStoreProducts(storeId: string | undefined) {
  return useQuery({
    queryKey: ['store-products', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(id, name, slug)')
        .eq('store_id', storeId!)
        .eq('is_active', true)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!storeId,
    staleTime: 2 * 60_000,
  });
}
