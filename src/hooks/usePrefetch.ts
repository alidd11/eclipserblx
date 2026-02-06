import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for prefetching data on hover/focus to improve perceived performance.
 * Prefetches product details, store data, and related information.
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  /**
   * Prefetch a product by slug (for hover on product cards)
   */
  const prefetchProduct = useCallback(async (slug: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['product', slug],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('products')
          .select(`
            id, name, slug, description, price, images, is_active, is_featured,
            category_id, store_id, created_at, download_count, is_resellable,
            categories (id, name, slug),
            stores!inner (id, name, slug, logo_url, is_verified, is_trusted, is_active)
          `)
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();
        
        if (error) throw error;
        return data;
      },
      staleTime: 30000, // 30 seconds
    });
  }, [queryClient]);

  /**
   * Prefetch a store by slug (for hover on store links)
   */
  const prefetchStore = useCallback(async (slug: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['store', slug],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('stores')
          .select(`
            id, name, slug, description, logo_url, banner_url,
            is_verified, is_trusted, follower_count, product_count,
            average_rating, total_sales
          `)
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();
        
        if (error) throw error;
        return data;
      },
      staleTime: 60000, // 1 minute
    });
  }, [queryClient]);

  /**
   * Prefetch the next page of paginated data
   */
  const prefetchNextPage = useCallback(async <T>(
    queryKey: unknown[],
    queryFn: () => Promise<T>
  ) => {
    await queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 30000,
    });
  }, [queryClient]);

  return {
    prefetchProduct,
    prefetchStore,
    prefetchNextPage,
  };
}

/**
 * Hook for background refetching on window focus.
 * Automatically refetches stale data when user returns to the tab.
 */
export function useBackgroundRefetch() {
  const queryClient = useQueryClient();

  const refetchStaleQueries = useCallback(() => {
    queryClient.refetchQueries({
      stale: true,
      type: 'active',
    });
  }, [queryClient]);

  return { refetchStaleQueries };
}
