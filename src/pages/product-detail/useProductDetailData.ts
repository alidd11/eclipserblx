import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useProductTranslation } from '@/hooks/useProductTranslation';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { STORE_LISTING_COLUMNS } from '@/lib/storeColumns';

export function useProductDetailData(productNumber: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isStaff, loading: adminLoading } = useAdminAuth();
  const { isSubscribed, isEligibleForDiscount, isEligibleForFreeClaim, getMemberPrice, getDiscountPercent, canClaimFree } = useSubscription();

  const isNumericParam = /^\d+$/.test(productNumber || '');
  const isUuidParam = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productNumber || '');

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productNumber, isStaff],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`*, categories(name, slug), stores(${STORE_LISTING_COLUMNS})`);

      if (isNumericParam) {
        query = query.eq('product_number' as any, Number(productNumber));
      } else if (isUuidParam) {
        query = query.eq('id', productNumber!);
      } else {
        query = query.eq('slug', productNumber!);
      }

      if (!isStaff) {
        query = query
          .eq('is_active', true)
          .or(`release_at.is.null,release_at.lte.${new Date().toISOString()}`);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !adminLoading && productNumber !== undefined,
    staleTime: 0,
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

  const { data: productReviews } = useQuery({
    queryKey: ['product-reviews', product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*, is_verified_purchase')
        .eq('product_id', product.id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching reviews:', error);
        return [];
      }
      if (!reviews || reviews.length === 0) return [];

      const userIds = [...new Set(reviews.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      return reviews.map(review => ({
        ...review,
        profile: profileMap.get(review.user_id) || null,
      }));
    },
    enabled: !!product?.id,
  });

  const { averageRating, reviewCount } = useMemo(() => {
    if (!productReviews || productReviews.length === 0) {
      return { averageRating: null, reviewCount: 0 };
    }
    const ratings = productReviews.map(r => r.rating).filter(r => typeof r === 'number');
    const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    return { averageRating: avg, reviewCount: productReviews.length };
  }, [productReviews]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['product', productNumber] });
    await queryClient.invalidateQueries({ queryKey: ['related-products'] });
    await queryClient.invalidateQueries({ queryKey: ['product-reviews', productNumber] });
    await queryClient.invalidateQueries({ queryKey: ['user-has-purchased'] });
  }, [queryClient, productNumber]);

  // Subscription pricing helpers
  const storeEclipseEnabled = product?.stores?.eclipse_plus_discount_enabled;
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
