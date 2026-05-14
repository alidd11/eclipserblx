import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReviewWithProfile {
  id: string;
  rating: number;
  content: string | null;
  created_at: string;
  is_verified_purchase: boolean | null;
  user_id: string;
  product_id: string;
  profile: { user_id: string; display_name: string | null; avatar_url: string | null } | null;
  product?: { id: string; name: string; slug: string; images: string[] | null; product_number?: number } | null;
}

/**
 * Centralised hook for fetching approved reviews with profile joins.
 *
 * Supports two scopes:
 * - `product`: Fetches reviews for a single product (used on ProductDetail)
 * - `store`: Fetches reviews across all of a store's products (used on StoreReviewsPage)
 *
 * Returns reviews, computed averageRating, and reviewCount.
 */
export function usePublicReviews(
  scope: { type: 'product'; productId: string | undefined } | { type: 'store'; storeId: string | undefined }
) {
  const isProductScope = scope.type === 'product';
  const id = isProductScope ? scope.productId : scope.storeId;

  const { data: reviews, isLoading } = useQuery({
    queryKey: isProductScope ? ['product-reviews', id] : ['store-reviews', id],
    queryFn: async (): Promise<ReviewWithProfile[]> => {
      if (!id) return [];

      let productIds: string[];
      let productMap: Map<string, any> | null = null;

      if (isProductScope) {
        productIds = [id];
      } else {
        // Store scope: fetch all product IDs first
        const { data: products } = await supabase
          .from('products')
          .select('id, name, slug, images, product_number')
          .eq('store_id', id);

        if (!products || products.length === 0) return [];
        productIds = products.map(p => p.id);
        productMap = new Map(products.map(p => [p.id, p]));
      }

      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select('id, rating, content, created_at, is_verified_purchase, user_id, product_id')
        .in('product_id', productIds)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(isProductScope ? 50 : 200);

      if (error) throw error;
      if (!reviewsData || reviewsData.length === 0) return [];

      // Batch-fetch profiles
      const userIds = [...new Set(reviewsData.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return reviewsData.map(review => ({
        id: review.id,
        rating: review.rating,
        content: review.content,
        created_at: review.created_at,
        is_verified_purchase: review.is_verified_purchase,
        user_id: review.user_id,
        product_id: review.product_id,
        profile: profileMap.get(review.user_id) || null,
        product: productMap?.get(review.product_id ?? '') ?? null,
      })) as any[];
    },
    enabled: !!id,
  });

  const { averageRating, reviewCount } = useMemo(() => {
    if (!reviews || reviews.length === 0) {
      return { averageRating: null, reviewCount: 0 };
    }
    const ratings = reviews.map(r => r.rating).filter(r => typeof r === 'number');
    const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    return { averageRating: avg, reviewCount: reviews.length };
  }, [reviews]);

  return {
    reviews: reviews || [],
    isLoading,
    averageRating,
    reviewCount,
  };
}
