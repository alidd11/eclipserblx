import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquare, BadgeCheck, SlidersHorizontal, ArrowUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VerifiedPurchaseBadge } from '@/components/reviews/VerifiedPurchaseBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  is_verified_purchase: boolean | null;
  product: {
    name: string;
    slug: string;
  } | null;
  profile: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

type SortOption = 'recent' | 'oldest' | 'highest' | 'lowest';
type RatingFilter = 'all' | '5' | '4' | '3' | '2' | '1';

export function StoreReviews({ storeId, storeName, accentColor = '#8b5cf6', averageRating }: StoreReviewsProps) {
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');

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
          is_verified_purchase,
          user_id,
          product_id
        `)
        .in('product_id', productIds)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(50);

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

  // Filter and sort reviews
  const filteredReviews = useMemo(() => {
    if (!reviews) return [];
    
    let result = [...reviews];
    
    // Filter by verified purchase
    if (showVerifiedOnly) {
      result = result.filter(r => r.is_verified_purchase);
    }
    
    // Filter by rating
    if (ratingFilter !== 'all') {
      result = result.filter(r => r.rating === parseInt(ratingFilter));
    }
    
    // Sort
    switch (sortBy) {
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'highest':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        result.sort((a, b) => a.rating - b.rating);
        break;
      case 'recent':
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    
    return result;
  }, [reviews, showVerifiedOnly, sortBy, ratingFilter]);

  const verifiedCount = useMemo(() => {
    return reviews?.filter(r => r.is_verified_purchase).length || 0;
  }, [reviews]);

  // Calculate rating distribution
  const ratingDistribution = reviews?.reduce((acc, review) => {
    acc[review.rating] = (acc[review.rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>) || {};

  const totalReviews = reviews?.length || 0;
  
  // Check if any filters are active
  const hasActiveFilters = showVerifiedOnly || ratingFilter !== 'all' || sortBy !== 'recent';
  
  const clearAllFilters = () => {
    setShowVerifiedOnly(false);
    setRatingFilter('all');
    setSortBy('recent');
  };

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case 'recent': return 'Most Recent';
      case 'oldest': return 'Oldest First';
      case 'highest': return 'Highest Rated';
      case 'lowest': return 'Lowest Rated';
    }
  };

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
              const isActive = ratingFilter === rating.toString();
              return (
                <button
                  key={rating}
                  onClick={() => setRatingFilter(isActive ? 'all' : rating.toString() as RatingFilter)}
                  className={cn(
                    "flex items-center gap-2 text-sm w-full rounded-md px-1 py-0.5 transition-colors",
                    isActive ? "bg-primary/10" : "hover:bg-muted/50"
                  )}
                >
                  <span className="w-3 text-muted-foreground">{rating}</span>
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${percentage}%`, backgroundColor: accentColor }}
                    />
                  </div>
                  <span className="w-8 text-right text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 pb-4 mb-4 border-b border-border">
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{getSortLabel(sortBy)}</span>
                <span className="sm:hidden">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[180px] bg-popover z-50">
              <DropdownMenuLabel>Sort Reviews</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <DropdownMenuRadioItem value="recent">Most Recent</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="oldest">Oldest First</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="highest">Highest Rated</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="lowest">Lowest Rated</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Rating Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 w-[120px]">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">
                  {ratingFilter === 'all' ? 'All Ratings' : `${ratingFilter} Stars`}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[140px] bg-popover z-50">
              <DropdownMenuLabel>Filter by Rating</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={ratingFilter} onValueChange={(v) => setRatingFilter(v as RatingFilter)}>
                <DropdownMenuRadioItem value="all">All Ratings</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="5">
                  <span className="flex items-center gap-1">
                    5 <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  </span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="4">
                  <span className="flex items-center gap-1">
                    4 <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  </span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="3">
                  <span className="flex items-center gap-1">
                    3 <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  </span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="2">
                  <span className="flex items-center gap-1">
                    2 <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  </span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="1">
                  <span className="flex items-center gap-1">
                    1 <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  </span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Verified Only Toggle */}
          {verifiedCount > 0 && (
            <Button
              variant={showVerifiedOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
              className="gap-1.5 h-8"
            >
              <BadgeCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Verified Only</span>
              <span className="sm:hidden">Verified</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {verifiedCount}
              </Badge>
            </Button>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="gap-1 h-8 text-muted-foreground hover:text-foreground ml-auto"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>

        {/* Results Count */}
        {(hasActiveFilters || filteredReviews.length !== totalReviews) && (
          <p className="text-sm text-muted-foreground mb-4">
            Showing {filteredReviews.length} of {totalReviews} reviews
          </p>
        )}

        {/* Reviews List */}
        {filteredReviews.length > 0 ? (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
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
                      {review.is_verified_purchase && <VerifiedPurchaseBadge />}
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
        ) : (
          <div className="py-8 text-center">
            {totalReviews === 0 ? (
              <>
                <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Reviews Yet</h3>
                <p className="text-muted-foreground">
                  Be the first to review a product from {storeName}!
                </p>
              </>
            ) : (
              <>
                <SlidersHorizontal className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-3">
                  No reviews match your filters.
                </p>
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  Clear Filters
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}