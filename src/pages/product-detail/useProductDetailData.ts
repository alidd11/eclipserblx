import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useProductTranslation } from '@/hooks/useProductTranslation';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { usePublicProduct } from '@/hooks/usePublicProduct';
import { usePublicReviews } from '@/hooks/usePublicReviews';

export function useProductDetailData(productNumber: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isStaff, loading: adminLoading } = useAdminAuth();
  const { isSubscribed, isEligibleForDiscount, isEligibleForFreeClaim, getMemberPrice, getDiscountPercent, canClaimFree } = useSubscription();

  // Centralised product fetching with resilient lookup chain
  const { product, isLoading } = usePublicProduct(productNumber, {
    isStaff,
    enabled: !adminLoading,
  });

  const { getTranslatedName, getTranslatedDescription } = useProductTranslation(product?.id);
  const { addProduct: addToRecentlyViewed } = useRecentlyViewed();

  const { data: relatedProducts } = useQuery({
    queryKey: ['related-products', product?.category_id, isStaff],
    queryFn: async () => {
      if (!product?.category_id) return [];
      let query = supabase
        .from('products')
        .select(`*, categories(name, slug)`)
        .eq('category_id', product.category_id)
        .neq('id', product.id);

      if (!isStaff) {
        query = query
          .eq('is_active', true)
          .or(`release_at.is.null,release_at.lte.${new Date().toISOString()}`);
      }

      const { data, error } = await query.limit(4);
      if (error) throw error;
      return data;
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

  // Subscription pricing helpers
  const storeEclipseEnabled = product?.undefined;
  const isEligible = product ? isEligibleForDiscount(product.category_id, product.is_resellable, storeEclipseEnabled) : false;
  const memberPrice = product && isEligible ? getMemberPrice(product.price, product.category_id, product.is_resellable) : product?.price ?? 0;
  const discountPercent = product && isEligible ? getDiscountPercent(product.category_id, product.is_resellable) : 0;
  const hasMemberDiscount = isEligible && memberPrice < (product?.price ?? 0);
  const canClaimThisProduct = product ? isSubscribed && canClaimFree && isEligibleForFreeClaim(product.category_id, product.is_resellable, product.eclipse_free_eligible) : false;

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
    // Pricing
    isEligible,
    memberPrice,
    discountPercent,
    hasMemberDiscount,
    canClaimThisProduct,
    storeEclipseEnabled,
  };
}
