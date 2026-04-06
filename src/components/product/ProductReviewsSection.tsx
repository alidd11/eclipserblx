import { useState, useMemo, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Star, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { VerifiedPurchaseBadge } from '@/components/reviews/VerifiedPurchaseBadge';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Review {
  id: string;
  rating: number;
  title?: string | null;
  content: string | null;
  created_at: string;
  is_verified_purchase: boolean;
  profile?: { display_name: string | null; avatar_url: string | null } | null;
  external_reviewer_name?: string | null;
}

interface ProductReviewsSectionProps {
  productId: string;
  productName: string;
  reviews: Review[];
  userId?: string;
  hasPurchased: boolean;
  existingReview: boolean;
}

export const ProductReviewsSection = forwardRef<HTMLElement, ProductReviewsSectionProps>(
  ({ productId, productName, reviews, userId, hasPurchased, existingReview }, ref) => {
    const queryClient = useQueryClient();
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);

    const filteredReviews = useMemo(() => {
      if (!showVerifiedOnly) return reviews;
      return reviews.filter(r => r.is_verified_purchase);
    }, [reviews, showVerifiedOnly]);

    const verifiedCount = useMemo(() => reviews.filter(r => r.is_verified_purchase).length, [reviews]);

    return (
      <section ref={ref} id="reviews" className="scroll-mt-8 border-t border-border/60 pt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground/70">
            Reviews
            {reviews.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground normal-case tracking-normal">({reviews.length})</span>
            )}
          </h2>
          {hasPurchased && !existingReview && userId && (
            <Button
              onClick={() => setShowReviewForm(!showReviewForm)}
              variant={showReviewForm ? 'outline' : 'default'}
              size="sm"
              className="h-8 text-xs"
            >
              {showReviewForm ? 'Cancel' : 'Write a Review'}
            </Button>
          )}
        </div>
        <div className="space-y-4">
          {showReviewForm && hasPurchased && !existingReview && userId && (
            <div className="border-b border-border pb-6">
              <ReviewForm
                productId={productId}
                productName={productName}
                isVerifiedPurchase={true}
                onSuccess={() => {
                  setShowReviewForm(false);
                  queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
                  queryClient.invalidateQueries({ queryKey: ['user-existing-review', productId, userId] });
                  supabase
                    .from('review_reminders')
                    .update({ review_submitted: true })
                    .eq('user_id', userId)
                    .eq('product_id', productId)
                    .then(({ error }) => {
                      if (error) console.warn('Failed to mark review reminder:', error.message);
                    });
                }}
              />
            </div>
          )}

          {existingReview && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
              <p className="text-sm text-primary">
                ✓ You've already submitted a review for this product. Thank you!
              </p>
            </div>
          )}

          {userId && !hasPurchased && (
            <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Purchase this product to leave a review</p>
            </div>
          )}

          {!userId && (
            <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to leave a review
              </p>
            </div>
          )}

          {reviews.length > 0 && verifiedCount > 0 && (
            <div className="flex items-center justify-between border-b border-border pb-4">
              <span className="text-sm text-muted-foreground">
                {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                {verifiedCount > 0 && ` (${verifiedCount} verified)`}
              </span>
              <Button
                variant={showVerifiedOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                className="gap-1.5"
              >
                <BadgeCheck className="h-4 w-4" />
                Verified Only
              </Button>
            </div>
          )}

          {filteredReviews.length > 0 ? (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <div key={review.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {review.profile?.avatar_url ? (
                        <img src={review.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
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
                                'h-3.5 w-3.5',
                                star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {review.title && <h4 className="font-medium mt-1">{review.title}</h4>}
                      <p className="text-sm text-muted-foreground mt-1">{review.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : showVerifiedOnly && reviews.length > 0 ? (
            <p className="text-center text-muted-foreground py-4">No verified purchase reviews yet.</p>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No reviews yet. Be the first to share your experience!
            </p>
          )}
        </div>
      </section>
    );
  }
);

ProductReviewsSection.displayName = 'ProductReviewsSection';
