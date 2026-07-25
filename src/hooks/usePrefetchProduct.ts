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
    (identifier: string | number | undefined | null) => {
      if (identifier === undefined || identifier === null || identifier === '') return;
      const idStr = String(identifier);
      const key = ['product', idStr];
      // Skip if already cached and fresh
      if (queryClient.getQueryData(key)) return;

      const isNumeric = /^\d+$/.test(idStr);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idStr);

      queryClient.prefetchQuery({
        queryKey: key,
        queryFn: async () => {
          let q = supabase
            .from('products')
            .select(
               `id, name, slug, description, price, images, category_id, is_resellable, is_active,
               download_count, product_number,
               stores!inner(id, name, slug, logo_url, is_verified, accent_color),
               categories(name, slug)`
            )
            .eq('is_active', true);

          if (isNumeric) {
            q = q.eq('product_number' as any, Number(idStr));
          } else if (isUuid) {
            q = q.eq('id', idStr);
          } else {
            q = q.eq('slug', idStr);
          }

          const { data } = await q.maybeSingle();
          return data;
        },
        staleTime: PRODUCT_PREFETCH_STALE,
      });
    },
    [queryClient]
  );

  return prefetch;
}
