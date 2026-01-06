import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Star, Check, X, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  is_approved: boolean;
  is_featured: boolean;
  created_at: string;
  user_id: string;
  product_id: string | null;
  profiles: { display_name: string | null; email: string } | null;
  products: { name: string } | null;
}

export default function AdminReviews() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'featured'>('all');

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['admin-reviews', filter],
    queryFn: async () => {
      let query = supabase
        .from('reviews')
        .select(`
          id,
          rating,
          title,
          content,
          is_approved,
          is_featured,
          created_at,
          user_id,
          product_id,
          products:product_id(name)
        `)
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('is_approved', false);
      } else if (filter === 'approved') {
        query = query.eq('is_approved', true);
      } else if (filter === 'featured') {
        query = query.eq('is_featured', true);
      }

      const { data: reviewsData, error } = await query;
      if (error) throw error;

      // Fetch profiles separately
      const userIds = reviewsData?.map(r => r.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return reviewsData?.map(review => ({
        ...review,
        profiles: profileMap.get(review.user_id) || null,
      })) as Review[];
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Review> }) => {
      const { error } = await supabase
        .from('reviews')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['featured-reviews'] });
      toast.success('Review updated');
    },
    onError: () => {
      toast.error('Failed to update review');
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['featured-reviews'] });
      toast.success('Review deleted');
    },
    onError: () => {
      toast.error('Failed to delete review');
    },
  });

  const handleApprove = (id: string, approved: boolean) => {
    updateReviewMutation.mutate({ id, updates: { is_approved: approved } });
  };

  const handleFeature = (id: string, featured: boolean) => {
    updateReviewMutation.mutate({ 
      id, 
      updates: { is_featured: featured, is_approved: featured ? true : undefined } 
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Reviews</h1>
            <p className="text-muted-foreground">Manage customer reviews</p>
          </div>

          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter reviews" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reviews</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading reviews...</div>
        ) : !reviews?.length ? (
          <div className="text-center py-12 text-muted-foreground">No reviews found</div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="max-w-[300px]">Review</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div className="font-medium">
                        {review.profiles?.display_name || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {review.products?.name || (
                        <span className="text-muted-foreground">General</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < review.rating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      {review.title && (
                        <div className="font-medium text-sm mb-1">{review.title}</div>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {review.content}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {review.is_featured ? (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                            Featured
                          </Badge>
                        ) : review.is_approved ? (
                          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                            Approved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(review.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!review.is_approved && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleApprove(review.id, true)}
                            title="Approve"
                          >
                            <Check className="h-4 w-4 text-emerald-400" />
                          </Button>
                        )}
                        {review.is_approved && !review.is_featured && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleFeature(review.id, true)}
                            title="Feature on homepage"
                          >
                            <Sparkles className="h-4 w-4 text-amber-400" />
                          </Button>
                        )}
                        {review.is_featured && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleFeature(review.id, false)}
                            title="Remove from featured"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteReviewMutation.mutate(review.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
