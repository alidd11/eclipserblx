import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PRODUCT_PREFETCH_STALE = 1000 * 60 * 5; // 5 minutes

/**
 * Returns a prefetch handler to warm the product detail query cache on hover/touch.
 * Used automatically by ProductCard — no manual wiring needed.
 */
export function usePrefetchProduct() {
  const queryClient = useQueryClient();

  const prefetch = useCallback(
    (productNumber: string | number) => {
      const key = ['product', String(productNumber)];
      // Skip if already cached and fresh
      if (queryClient.getQueryData(key)) return;

      queryClient.prefetchQuery({
        queryKey: key,
        queryFn: async () => {
          const { data } = await supabase
            .from('products')
            .select(
               `id, name, slug, description, price, images, category_id, is_resellable, is_active,
               download_count, product_number,
               stores!inner(id, name, slug, logo_url, is_verified, accent_color, eclipse_plus_discount_enabled),
               categories(name, slug)`
            )
            .eq('product_number' as any, Number(productNumber))
            .eq('is_active', true)
            .maybeSingle();
          return data;
        },
        staleTime: PRODUCT_PREFETCH_STALE,
      });
    },
    [queryClient]
  );

  return prefetch;
}
