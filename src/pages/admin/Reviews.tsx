import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Star, Check, X, Sparkles, Trash2, Plus, Globe, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  is_approved: boolean;
  is_featured: boolean;
  is_external: boolean;
  external_source: string | null;
  external_reviewer_name: string | null;
  created_at: string;
  user_id: string;
  product_id: string | null;
  profiles: { display_name: string | null; email: string } | null;
  products: { name: string } | null;
}

interface ExternalReviewForm {
  reviewer_name: string;
  source: string;
  rating: number;
  title: string;
  content: string;
}

const emptyExternalForm: ExternalReviewForm = {
  reviewer_name: '',
  source: '',
  rating: 5,
  title: '',
  content: '',
};

const sourceOptions = [
  'Trustpilot',
  'Google Reviews',
  'ClearlyDev',
  'Discord',
  'Twitter/X',
  'Reddit',
  'Facebook',
  'Instagram',
  'YouTube',
  'Other',
];

export default function AdminReviews() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'featured'>('all');
  const [activeTab, setActiveTab] = useState('customer');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [externalForm, setExternalForm] = useState<ExternalReviewForm>(emptyExternalForm);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['admin-reviews', filter, activeTab],
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
          is_external,
          external_source,
          external_reviewer_name,
          created_at,
          user_id,
          product_id,
          products:product_id(name)
        `)
        .order('created_at', { ascending: false });

      // Filter by external/customer
      if (activeTab === 'external') {
        query = query.eq('is_external', true);
      } else {
        query = query.eq('is_external', false);
      }

      if (filter === 'pending') {
        query = query.eq('is_approved', false);
      } else if (filter === 'approved') {
        query = query.eq('is_approved', true);
      } else if (filter === 'featured') {
        query = query.eq('is_featured', true);
      }

      const { data: reviewsData, error } = await query;
      if (error) throw error;

      // Fetch profiles separately for customer reviews
      if (activeTab === 'customer') {
        const userIds = reviewsData?.map(r => r.user_id).filter(Boolean) || [];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        return reviewsData?.map(review => ({
          ...review,
          profiles: profileMap.get(review.user_id) || null,
        })) as Review[];
      }

      return reviewsData as Review[];
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

  const addExternalReviewMutation = useMutation({
    mutationFn: async (data: ExternalReviewForm) => {
      // Get current user for user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('reviews').insert({
        user_id: user.id,
        rating: data.rating,
        title: data.title || null,
        content: data.content,
        is_approved: true, // Auto-approve external reviews
        is_featured: false,
        is_external: true,
        external_source: data.source,
        external_reviewer_name: data.reviewer_name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      setIsAddDialogOpen(false);
      setExternalForm(emptyExternalForm);
      toast.success('External review added');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add review');
    },
  });

  const handleApprove = async (id: string, approved: boolean) => {
    // Find the review to get its details for the webhook
    const review = reviews?.find(r => r.id === id);
    
    updateReviewMutation.mutate(
      { id, updates: { is_approved: approved } },
      {
        onSuccess: async () => {
          // Only send Discord notification when approving (not un-approving)
          if (approved && review) {
            try {
              await supabase.functions.invoke('send-review-discord-notification', {
                body: {
                  reviewId: review.id,
                  rating: review.rating,
                  title: review.title,
                  content: review.content,
                  userId: review.user_id,
                  productId: review.product_id,
                },
              });
            } catch (error) {
              console.error('Failed to send review Discord notification:', error);
              // Don't show error to user - webhook is non-blocking
            }
          }
        },
      }
    );
  };

  const handleFeature = (id: string, featured: boolean) => {
    updateReviewMutation.mutate({ 
      id, 
      updates: { is_featured: featured, is_approved: featured ? true : undefined } 
    });
  };

  const handleAddExternalReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalForm.reviewer_name || !externalForm.source || !externalForm.content) {
      toast.error('Please fill in required fields');
      return;
    }
    addExternalReviewMutation.mutate(externalForm);
  };

  const getReviewerName = (review: Review) => {
    if (review.is_external) {
      return review.external_reviewer_name || 'Unknown';
    }
    return review.profiles?.display_name || 'Unknown';
  };

  const renderReviewCard = (review: Review) => (
    <Card key={review.id} className="bg-muted/30 border-border overflow-hidden">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm truncate">{getReviewerName(review)}</span>
            {review.is_external && (
              <Badge variant="outline" className="text-blue-400 border-blue-500/30 text-xs flex-shrink-0">
                <Globe className="h-3 w-3 mr-1" />
                {review.external_source}
              </Badge>
            )}
          </div>
          {review.is_featured ? (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 flex-shrink-0">Featured</Badge>
          ) : review.is_approved ? (
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 flex-shrink-0">Approved</Badge>
          ) : (
            <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 flex-shrink-0">Pending</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} />
          ))}
          {review.products?.name && (
            <span className="text-xs text-muted-foreground ml-2">{review.products.name}</span>
          )}
        </div>
        {review.title && <p className="font-medium text-sm">{review.title}</p>}
        <p className="text-sm text-muted-foreground line-clamp-3">{review.content}</p>
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">{format(new Date(review.created_at), 'MMM d, yyyy')}</span>
          <div className="flex items-center gap-1">
            {!review.is_approved && (
              <Button size="sm" variant="ghost" onClick={() => handleApprove(review.id, true)} className="h-9 w-9 p-0 touch-manipulation active:scale-95">
                <Check className="h-4 w-4 text-emerald-400" />
              </Button>
            )}
            {review.is_approved && !review.is_featured && (
              <Button size="sm" variant="ghost" onClick={() => handleFeature(review.id, true)} className="h-9 w-9 p-0 touch-manipulation active:scale-95">
                <Sparkles className="h-4 w-4 text-amber-400" />
              </Button>
            )}
            {review.is_featured && (
              <Button size="sm" variant="ghost" onClick={() => handleFeature(review.id, false)} className="h-9 w-9 p-0 touch-manipulation active:scale-95">
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => deleteReviewMutation.mutate(review.id)} className="h-9 w-9 p-0 touch-manipulation active:scale-95">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderReviewRow = (review: Review) => (
    <TableRow key={review.id}>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium">{getReviewerName(review)}</span>
          {review.is_external && (
            <Badge variant="outline" className="text-blue-400 border-blue-500/30 text-xs">
              <Globe className="h-3 w-3 mr-1" />
              {review.external_source}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>{review.products?.name || <span className="text-muted-foreground">General</span>}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} />
          ))}
        </div>
      </TableCell>
      <TableCell className="max-w-[300px]">
        {review.title && <div className="font-medium text-sm mb-1">{review.title}</div>}
        <p className="text-sm text-muted-foreground line-clamp-2">{review.content}</p>
      </TableCell>
      <TableCell>
        {review.is_featured ? (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Featured</Badge>
        ) : review.is_approved ? (
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">Approved</Badge>
        ) : (
          <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">Pending</Badge>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{format(new Date(review.created_at), 'MMM d, yyyy')}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          {!review.is_approved && (
            <Button size="sm" variant="ghost" onClick={() => handleApprove(review.id, true)} title="Approve">
              <Check className="h-4 w-4 text-emerald-400" />
            </Button>
          )}
          {review.is_approved && !review.is_featured && (
            <Button size="sm" variant="ghost" onClick={() => handleFeature(review.id, true)} title="Feature on homepage">
              <Sparkles className="h-4 w-4 text-amber-400" />
            </Button>
          )}
          {review.is_featured && (
            <Button size="sm" variant="ghost" onClick={() => handleFeature(review.id, false)} title="Remove from featured">
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => deleteReviewMutation.mutate(review.id)} title="Delete">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl sm:text-3xl font-display">Reviews</CardTitle>
                <CardDescription>Manage customer and external reviews</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="customer" className="flex-1 sm:flex-none">Customer Reviews</TabsTrigger>
                  <TabsTrigger value="external" className="flex-1 sm:flex-none">External Reviews</TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                  {activeTab === 'external' && (
                    <Button onClick={() => setIsAddDialogOpen(true)} className="gradient-button border-0">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Review
                    </Button>
                  )}
                  <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="featured">Featured</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsContent value="customer" className="mt-4">
                {isLoading ? (
                  <div className="text-center py-12 text-muted-foreground">Loading reviews...</div>
                ) : !reviews?.length ? (
                  <div className="text-center py-12 text-muted-foreground">No customer reviews found</div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="block md:hidden space-y-3">
                      {reviews.map(renderReviewCard)}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block border rounded-lg overflow-hidden">
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
                          {reviews.map(renderReviewRow)}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="external" className="mt-4">
                {isLoading ? (
                  <div className="text-center py-12 text-muted-foreground">Loading reviews...</div>
                ) : !reviews?.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Globe className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p>No external reviews yet</p>
                    <p className="text-sm mt-1">Add reviews from Trustpilot, Google, Discord, and more</p>
                    <Button onClick={() => setIsAddDialogOpen(true)} className="mt-4 gradient-button border-0">
                      <Plus className="h-4 w-4 mr-2" />
                      Add External Review
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="block md:hidden space-y-3">
                      {reviews.map(renderReviewCard)}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Reviewer</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead className="max-w-[300px]">Review</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reviews.map(renderReviewRow)}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Add External Review Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add External Review</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddExternalReview} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reviewer_name">Reviewer Name *</Label>
              <Input
                id="reviewer_name"
                value={externalForm.reviewer_name}
                onChange={(e) => setExternalForm({ ...externalForm, reviewer_name: e.target.value })}
                placeholder="John Doe"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source *</Label>
              <Select 
                value={externalForm.source} 
                onValueChange={(v) => setExternalForm({ ...externalForm, source: v })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select source..." />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((source) => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rating *</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setExternalForm({ ...externalForm, rating: star })}
                    className="p-1 touch-manipulation"
                  >
                    <Star 
                      className={`h-6 w-6 transition-colors ${
                        star <= externalForm.rating 
                          ? 'text-amber-400 fill-amber-400' 
                          : 'text-muted-foreground hover:text-amber-400/50'
                      }`} 
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title (Optional)</Label>
              <Input
                id="title"
                value={externalForm.title}
                onChange={(e) => setExternalForm({ ...externalForm, title: e.target.value })}
                placeholder="Great product!"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Review Content *</Label>
              <Textarea
                id="content"
                value={externalForm.content}
                onChange={(e) => setExternalForm({ ...externalForm, content: e.target.value })}
                placeholder="Paste the review content here..."
                rows={4}
                className="bg-background resize-none"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addExternalReviewMutation.isPending} className="gradient-button border-0">
                {addExternalReviewMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Review
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
