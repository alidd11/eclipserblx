import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const ROUTE_PREFETCH_STALE = 1000 * 60 * 5; // 5 minutes

/**
 * Provides prefetch functions for common route patterns.
 * Used by PrefetchLink to warm React Query cache before navigation.
 */
export function usePrefetchRoute() {
  const qc = useQueryClient();

  const prefetchCategory = useCallback(
    (slug: string) => {
      const key = ['category-products', slug];
      if (qc.getQueryData(key)) return;

      qc.prefetchQuery({
        queryKey: key,
        queryFn: async () => {
          const { data: cat } = await supabase
            .from('categories')
            .select('id, name, slug')
            .eq('slug', slug)
            .maybeSingle();
          if (!cat) return null;

          const { data: products } = await supabase
            .from('products')
            .select('id, name, slug, price, images, product_number, average_rating, review_count')
            .eq('category_id', cat.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(12);

          return { category: cat, products };
        },
        staleTime: ROUTE_PREFETCH_STALE,
      });
    },
    [qc],
  );

  const prefetchStore = useCallback(
    (slug: string) => {
      const key = ['store-preview', slug];
      if (qc.getQueryData(key)) return;

      qc.prefetchQuery({
        queryKey: key,
        queryFn: async () => {
          const { data } = await supabase
            .from('stores')
            .select('id, name, slug, logo_url, description, is_verified, accent_color')
            .eq('slug', slug)
            .maybeSingle();
          return data;
        },
        staleTime: ROUTE_PREFETCH_STALE,
      });
    },
    [qc],
  );

  /** Resolve a path like /category/scripts or /store/my-shop and prefetch its data */
  const prefetchForPath = useCallback(
    (path: string) => {
      if (typeof path !== 'string') return;

      const categoryMatch = path.match(/^\/category\/([^/?#]+)/);
      if (categoryMatch) {
        prefetchCategory(categoryMatch[1]);
        return;
      }

      const storeMatch = path.match(/^\/store\/([^/?#]+)/);
      if (storeMatch) {
        prefetchStore(storeMatch[1]);
        return;
      }
    },
    [prefetchCategory, prefetchStore],
  );

  return { prefetchCategory, prefetchStore, prefetchForPath };
}
