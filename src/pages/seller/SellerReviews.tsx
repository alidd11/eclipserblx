import { useState } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SellerLayout } from '@/components/seller/SellerLayout';
// Card imports removed — using enterprise flat sections
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Star, MessageSquare, ThumbsUp, Filter, ArrowUpDown,
  MessageCircle, Send, Loader2, X
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const REVIEWS_PER_PAGE = 15;

export default function SellerReviews() {
  const { store } = useSellerStatus();
  const queryClient = useQueryClient();
  const [filterRating, setFilterRating] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Fetch product IDs and names for this store
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
    staleTime: 5 * 60_000, // 5 minutes — product list rarely changes
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

      if (filterRating !== 'all') {
        query = query.eq('rating', parseInt(filterRating));
      }

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
    staleTime: 2 * 60_000, // 2 minutes
  });

  const reviews = reviewsData?.reviews || [];
  const totalCount = reviewsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / REVIEWS_PER_PAGE);

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async ({ reviewId, reply }: { reviewId: string; reply: string }) => {
      const { error } = await supabase
        .from('reviews')
        .update({
          seller_reply: reply,
          seller_replied_at: new Date().toISOString(),
        })
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reply posted');
      setReplyingTo(null);
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['seller-reviews'] });
    },
    onError: (err) => {
      toast.error('Failed to post reply: ' + (err as Error).message);
    },
  });

  const handleFilterChange = (value: string) => {
    setFilterRating(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const stats = reviews.length ? {
    total: totalCount,
    average: reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length,
    distribution: [5, 4, 3, 2, 1].map(rating => ({
      rating,
      count: reviews.filter((r: any) => r.rating === rating).length,
      percent: reviews.length > 0 ? (reviews.filter((r: any) => r.rating === rating).length / reviews.length) * 100 : 0,
    })),
  } : null;

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`} />
    ));

  return (
    <SellerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Reviews</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and respond to customer feedback</p>
        </div>

        {/* Stats Overview */}
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="text-muted-foreground">
            <span className="font-semibold text-yellow-500">{stats?.average.toFixed(1) || '0.0'}</span> avg rating
          </span>
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{stats?.total || 0}</span> reviews
          </span>
          <span className="text-muted-foreground">
            <span className="font-semibold text-green-500">
              {stats ? Math.round(((stats.distribution[0].count + stats.distribution[1].count) / Math.max(stats.total, 1)) * 100) : 0}%
            </span> positive
          </span>
        </div>

        {/* Rating Distribution */}
        {stats && (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-sm">Rating Distribution</h3>
            </div>
            <div className="p-4 space-y-3">
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
            <SelectTrigger className="w-auto min-w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              {[5, 4, 3, 2, 1].map(r => (
                <SelectItem key={r} value={String(r)}>{r} Star{r !== 1 ? 's' : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-auto min-w-[140px]">
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
            <Button variant="ghost" size="sm" onClick={() => handleFilterChange('all')}>Clear Filter</Button>
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
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review: any) => (
                  <div key={review.id} className="p-4 border rounded-lg space-y-3">
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
                              {review.is_external ? review.external_reviewer_name : review.profiles?.display_name || 'Anonymous'}
                            </span>
                            {review.is_external && (
                              <Badge variant="outline" className="text-xs">{review.external_source}</Badge>
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
                      <Badge variant="secondary" className="text-xs shrink-0">{review.product_name}</Badge>
                    </div>

                    {review.title && <p className="font-medium">{review.title}</p>}
                    <p className="text-sm text-muted-foreground">{review.content}</p>

                    {/* Seller Reply Section */}
                    {review.seller_reply ? (
                      <div className="ml-6 p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-1">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-medium text-primary">Your Reply</span>
                          {review.seller_replied_at && (
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(review.seller_replied_at), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm">{review.seller_reply}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setReplyingTo(review.id);
                            setReplyText(review.seller_reply);
                          }}
                        >
                          Edit Reply
                        </Button>
                      </div>
                    ) : replyingTo === review.id ? (
                      <div className="ml-6 space-y-2">
                        <Textarea
                          placeholder="Write a professional response…"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={3}
                          maxLength={1000}
                          className="text-sm"
                        />
                        <div className="flex items-center gap-2 justify-between">
                          <span className="text-[10px] text-muted-foreground">{replyText.length}/1000</span>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setReplyingTo(null); setReplyText(''); }}
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              disabled={!replyText.trim() || replyMutation.isPending}
                              onClick={() => replyMutation.mutate({ reviewId: review.id, reply: replyText.trim() })}
                              className="gap-1.5"
                            >
                              {replyMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              Post Reply
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-6 h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                        onClick={() => setReplyingTo(review.id)}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Reply
                      </Button>
                    )}
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4" /> Previous
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                        Next <ChevronRight className="h-4 w-4" />
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
