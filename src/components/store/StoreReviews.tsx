import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoreReviewsProps {
  storeId: string;
  storeName: string;
  accentColor?: string;
  averageRating?: number | null;
}

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  created_at: string;
  external_reviewer_name: string | null;
  is_external: boolean | null;
  product: {
    name: string;
    slug: string;
  } | null;
  profile: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function StoreReviews({ storeId, storeName, accentColor = '#8b5cf6', averageRating }: StoreReviewsProps) {
  // Fetch reviews for all products in this store
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['store-reviews', storeId],
    queryFn: async () => {
      // First get all product IDs for this store
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', storeId)
        .eq('is_active', true);

      if (productsError) throw productsError;
      if (!products || products.length === 0) return [];

      const productIds = products.map(p => p.id);

      // Then fetch approved reviews for those products
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          title,
          content,
          created_at,
          external_reviewer_name,
          is_external,
          user_id,
          product_id
        `)
        .in('product_id', productIds)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (reviewsError) throw reviewsError;
      if (!reviewsData || reviewsData.length === 0) return [];

      // Fetch product names and user profiles
      const userIds = [...new Set(reviewsData.filter(r => !r.is_external).map(r => r.user_id))];
      const reviewProductIds = [...new Set(reviewsData.map(r => r.product_id).filter(Boolean))];

      const [profilesResult, productsResult] = await Promise.all([
        userIds.length > 0
          ? supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds)
          : Promise.resolve({ data: [] }),
        reviewProductIds.length > 0
          ? supabase.from('products').select('id, name, slug').in('id', reviewProductIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profilesMap = new Map((profilesResult.data || []).map(p => [p.user_id, p]));
      const productsMap = new Map((productsResult.data || []).map(p => [p.id, p]));

      return reviewsData.map(review => ({
        ...review,
        profile: profilesMap.get(review.user_id) || null,
        product: productsMap.get(review.product_id) || null,
      })) as Review[];
    },
    enabled: !!storeId,
  });

  // Calculate rating distribution
  const ratingDistribution = reviews?.reduce((acc, review) => {
    acc[review.rating] = (acc[review.rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>) || {};

  const totalReviews = reviews?.length || 0;

  if (isLoading) {
    return (
      <Card id="store-reviews" className="scroll-mt-20">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <Card id="store-reviews" className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" style={{ color: accentColor }} />
            Customer Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Reviews Yet</h3>
            <p className="text-muted-foreground">
              Be the first to review a product from {storeName}!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="store-reviews" className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" style={{ color: accentColor }} />
          Customer Reviews
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Rating Summary */}
        <div className="flex flex-col sm:flex-row gap-6 mb-6 pb-6 border-b border-border">
          {/* Average Rating */}
          <div className="flex flex-col items-center justify-center min-w-[120px]">
            <div className="text-4xl font-bold" style={{ color: accentColor }}>
              {averageRating?.toFixed(1) || '—'}
            </div>
            <div className="flex items-center gap-0.5 my-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-4 w-4",
                    averageRating && star <= Math.round(averageRating)
                      ? "text-amber-400 fill-amber-400"
                      : "text-muted-foreground"
                  )}
                />
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = ratingDistribution[rating] || 0;
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-2 text-sm">
                  <span className="w-3 text-muted-foreground">{rating}</span>
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${percentage}%`, backgroundColor: accentColor }}
                    />
                  </div>
                  <span className="w-8 text-right text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {review.profile?.avatar_url ? (
                    <img
                      src={review.profile.avatar_url}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-primary">
                      {(review.profile?.display_name || review.external_reviewer_name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">
                      {review.profile?.display_name || review.external_reviewer_name || 'Anonymous'}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "h-3.5 w-3.5",
                            star <= review.rating
                              ? "text-amber-400 fill-amber-400"
                              : "text-muted-foreground"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.product && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Reviewed: {review.product.name}
                    </p>
                  )}
                  {review.title && (
                    <h4 className="font-medium mt-1">{review.title}</h4>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    {review.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}