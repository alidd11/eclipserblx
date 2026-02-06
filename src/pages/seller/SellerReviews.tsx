import { useState } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Star, 
  TrendingUp, 
  MessageSquare,
  ThumbsUp,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { format } from 'date-fns';

const REVIEWS_PER_PAGE = 15;

export default function SellerReviews() {
  const { store } = useSellerStatus();
  const [filterRating, setFilterRating] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch product IDs and names for this store (cached separately)
  const { data: productMap } = useQuery({
    queryKey: ['seller-product-map', store?.id],
    queryFn: async () => {
      if (!store?.id) return {};
      
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('store_id', store.id);

      if (error) throw error;
      return Object.fromEntries((data || []).map(p => [p.id, p.name]));
    },
    enabled: !!store?.id,
    staleTime: 60000,
  });

  // Fetch reviews with pagination
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['seller-reviews', store?.id, currentPage, filterRating, sortBy],
    queryFn: async () => {
      if (!store?.id || !productMap) return { reviews: [], totalCount: 0 };
      
      const productIds = Object.keys(productMap);
      if (productIds.length === 0) return { reviews: [], totalCount: 0 };

      const from = (currentPage - 1) * REVIEWS_PER_PAGE;
      const to = from + REVIEWS_PER_PAGE - 1;

      let query = supabase
        .from('reviews')
        .select('*, profiles(display_name, avatar_url)', { count: 'exact' })
        .in('product_id', productIds)
        .eq('is_approved', true);

      // Apply rating filter at DB level
      if (filterRating !== 'all') {
        query = query.eq('rating', parseInt(filterRating));
      }

      // Apply sort
      if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (sortBy === 'highest') {
        query = query.order('rating', { ascending: false }).order('created_at', { ascending: false });
      } else if (sortBy === 'lowest') {
        query = query.order('rating', { ascending: true }).order('created_at', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, count, error } = await query.range(from, to);

      if (error) throw error;
      
      const reviews = (data || []).map((r: any) => ({
        ...r,
        product_name: productMap[r.product_id] || 'Unknown Product',
      }));

      return { reviews, totalCount: count || 0 };
    },
    enabled: !!store?.id && !!productMap,
    staleTime: 30000,
  });

  const reviews = reviewsData?.reviews || [];
  const totalCount = reviewsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / REVIEWS_PER_PAGE);

  // Reset page when filters change
  const handleFilterChange = (value: string) => {
    setFilterRating(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  // Calculate stats (note: for accurate overall stats with pagination, would need separate aggregation query)
  const stats = reviews.length ? {
    total: totalCount,
    average: reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length,
    distribution: [5, 4, 3, 2, 1].map(rating => ({
      rating,
      count: reviews.filter((r: any) => r.rating === rating).length,
      percent: reviews.length > 0 ? (reviews.filter((r: any) => r.rating === rating).length / reviews.length) * 100 : 0,
    })),
  } : null;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`}
      />
    ));
  };

  return (
    <SellerLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" />
            Reviews
          </h1>
          <p className="text-muted-foreground">
            Manage and respond to customer feedback
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-3xl font-bold">
                      {stats?.average.toFixed(1) || '0.0'}
                    </span>
                    <div className="flex">{renderStars(Math.round(stats?.average || 0))}</div>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-yellow-500/10">
                  <Star className="h-6 w-6 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Reviews</p>
                  <span className="text-3xl font-bold">{stats?.total || 0}</span>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Positive Reviews</p>
                  <span className="text-3xl font-bold text-green-600">
                    {stats ? Math.round(((stats.distribution[0].count + stats.distribution[1].count) / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="p-3 rounded-full bg-green-500/10">
                  <ThumbsUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rating Distribution */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rating Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.distribution.map(({ rating, count, percent }) => (
                <button
                  key={rating}
                  onClick={() => setFilterRating(filterRating === String(rating) ? 'all' : String(rating))}
                  className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors ${
                    filterRating === String(rating) ? 'bg-primary/10' : 'hover:bg-muted/50'
                  }`}
                >
                  <span className="w-8 text-sm font-medium">{rating}★</span>
                  <Progress value={percent} className="flex-1 h-2" />
                  <span className="w-16 text-sm text-muted-foreground text-right">{count} ({percent.toFixed(0)}%)</span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={filterRating} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
              <SelectItem value="4">4 Stars</SelectItem>
              <SelectItem value="3">3 Stars</SelectItem>
              <SelectItem value="2">2 Stars</SelectItem>
              <SelectItem value="1">1 Star</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="highest">Highest Rating</SelectItem>
              <SelectItem value="lowest">Lowest Rating</SelectItem>
            </SelectContent>
          </Select>

          {filterRating !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => handleFilterChange('all')}>
              Clear Filter
            </Button>
          )}
        </div>

        {/* Reviews List */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Reviews</CardTitle>
            <CardDescription>
              {totalCount} review{totalCount !== 1 ? 's' : ''}
              {filterRating !== 'all' && ` with ${filterRating} stars`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reviewsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review: any) => (
                  <div key={review.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {review.is_external 
                              ? review.external_reviewer_name?.charAt(0).toUpperCase() 
                              : review.profiles?.display_name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {review.is_external 
                                ? review.external_reviewer_name 
                                : review.profiles?.display_name || 'Anonymous'}
                            </span>
                            {review.is_external && (
                              <Badge variant="outline" className="text-xs">
                                {review.external_source}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex">{renderStars(review.rating)}</div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(review.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {review.product_name}
                      </Badge>
                    </div>
                    {review.title && (
                      <p className="font-medium mt-3">{review.title}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">
                      {review.content}
                    </p>
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No reviews yet</p>
                <p className="text-sm">Reviews will appear here once customers leave feedback</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SellerLayout>
  );
}
