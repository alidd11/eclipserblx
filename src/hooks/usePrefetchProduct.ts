import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns a prefetch handler to warm the product detail query cache on hover.
 * Attach `onMouseEnter={prefetch}` to product card links.
 */
export function usePrefetchProduct() {
  const queryClient = useQueryClient();

  const prefetch = useCallback(
    (slug: string) => {
      queryClient.prefetchQuery({
        queryKey: ['product', slug],
        queryFn: async () => {
          const { data } = await supabase
            .from('products')
            .select(
              `id, name, slug, description, price, images, category_id, is_resellable, is_active,
               average_rating, review_count, sales_count,
               stores!inner(id, name, slug, logo_url, is_verified, is_trusted, accent_color, eclipse_plus_discount_enabled),
               categories(name, slug)`
            )
            .eq('slug', slug)
            .eq('is_active', true)
            .maybeSingle();
          return data;
        },
        staleTime: 1000 * 60 * 2, // 2 minutes
      });
    },
    [queryClient]
  );

  return prefetch;
}
