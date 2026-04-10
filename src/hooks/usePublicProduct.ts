import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STORE_LISTING_COLUMNS } from '@/lib/storeColumns';

/**
 * Centralised hook for fetching a single public product.
 *
 * Supports the resilient lookup chain:
 *  1. Numeric product_number (primary)
 *  2. UUID (secondary)
 *  3. Slug (tertiary)
 *
 * Access rules enforced:
 *  - is_active = true (unless staff)
 *  - release_at <= now (unless staff)
 *  - moderation_status is NOT filtered here (product can be viewed by direct link)
 *
 * Joins: categories, stores (listing columns)
 */
export function usePublicProduct(
  productIdentifier: string | undefined,
  options?: { isStaff?: boolean; enabled?: boolean }
) {
  const isStaff = options?.isStaff ?? false;
  const externalEnabled = options?.enabled ?? true;

  const isNumeric = /^\d+$/.test(productIdentifier || '');
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productIdentifier || '');

  const query = useQuery({
    queryKey: ['product', productIdentifier, isStaff],
    queryFn: async () => {
      let q = supabase
        .from('products')
        .select(`*, categories(name, slug), stores(${STORE_LISTING_COLUMNS})`);

      if (isNumeric) {
        q = q.eq('product_number' as any, Number(productIdentifier));
      } else if (isUuid) {
        q = q.eq('id', productIdentifier!);
      } else {
        q = q.eq('slug', productIdentifier!);
      }

      if (!isStaff) {
        q = q
          .eq('is_active', true)
          .or(`release_at.is.null,release_at.lte.${new Date().toISOString()}`);
      }

      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: externalEnabled && productIdentifier !== undefined,
    staleTime: 0,
  });

  return {
    product: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    notFound: !query.isLoading && !query.data,
  };
}
