import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useProductTranslation } from '@/hooks/useProductTranslation';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { usePublicProduct } from '@/hooks/usePublicProduct';
import { usePublicReviews } from '@/hooks/usePublicReviews';

export function useProductDetailData(productNumber: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isStaff, loading: adminLoading } = useAdminAuth();

  // Centralised product fetching with resilient lookup chain
  const { product, isLoading } = usePublicProduct(productNumber, {
    isStaff,
    enabled: !adminLoading,
  });

  const { getTranslatedName, getTranslatedDescription } = useProductTranslation(product?.id);
  const { addProduct: addToRecentlyViewed } = useRecentlyViewed();

  const { data: relatedProducts } = useQuery({
    queryKey: ['related-products', product?.id, product?.category_id, isStaff],
    queryFn: async () => {
      if (!product?.category_id) return [];
      const RELATED_LIMIT = 4;
      const buildBaseQuery = () => {
        let query = supabase.from('products').select(`*, categories(name, slug)`).neq('id', product.id);
        if (!isStaff) {
          query = query
            .eq('is_active', true)
            .or(`release_at.is.null,release_at.lte.${new Date().toISOString()}`);
        }
        return query;
      };

      const { data: sameCategory, error } = await buildBaseQuery()
        .eq('category_id', product.category_id)
        .limit(RELATED_LIMIT);
      if (error) throw error;

      // Same-category inventory can be thin — backfill with popular products
      // elsewhere so the related-products rail doesn't look sparse.
      const results = sameCategory ?? [];
      if (results.length < RELATED_LIMIT) {
        const excludeIds = [product.id, ...results.map((p) => p.id)];
        const { data: backfill } = await buildBaseQuery()
          .not('id', 'in', `(${excludeIds.join(',')})`)
          .order('download_count', { ascending: false })
          .limit(RELATED_LIMIT - results.length);
        if (backfill) results.push(...backfill);
      }
      return results;
    },
    enabled: !!product?.category_id,
  });

  const { data: hasPurchased } = useQuery({
    queryKey: ['user-has-purchased', product?.id, user?.id],
    queryFn: async () => {
      if (!product?.id || !user) return false;
      const { data, error } = await supabase.rpc('user_has_purchased_product', {
        _user_id: user.id,
        _product_id: product.id,
      });
      if (error) {
        console.error('Error checking purchase:', error);
        return false;
      }
      return Boolean(data);
    },
    enabled: !!product?.id && !!user,
    staleTime: 1000 * 60 * 5,
  });

  const { data: existingReview } = useQuery({
    queryKey: ['user-existing-review', product?.id, user?.id],
    queryFn: async () => {
      if (!product?.id || !user?.id) return null;
      const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .eq('product_id', product.id)
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('Error checking review:', error);
        return null;
      }
      return data;
    },
    enabled: !!product?.id && !!user?.id,
  });

  // Centralised review fetching
  const { reviews: productReviews, averageRating, reviewCount } = usePublicReviews({
    type: 'product',
    productId: product?.id,
  });

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['product', productNumber] });
    await queryClient.invalidateQueries({ queryKey: ['related-products'] });
    await queryClient.invalidateQueries({ queryKey: ['product-reviews', productNumber] });
    await queryClient.invalidateQueries({ queryKey: ['user-has-purchased'] });
  }, [queryClient, productNumber]);

  return {
    product,
    isLoading,
    adminLoading,
    isStaff,
    user,
    relatedProducts,
    hasPurchased,
    existingReview,
    productReviews,
    averageRating,
    reviewCount,
    handleRefresh,
    getTranslatedName,
    getTranslatedDescription,
    addToRecentlyViewed,
  };
}
