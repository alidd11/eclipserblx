import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';
import { useQueryClient } from '@tanstack/react-query';
import { reviewSchema, validateWithSchema, isValidationError } from '@/lib/validationSchemas';

interface ReviewFormProps {
  productId?: string;
  productName?: string;
  isVerifiedPurchase?: boolean;
  onSuccess?: () => void;
}

export function ReviewForm({ productId, productName, isVerifiedPurchase = false, onSuccess }: ReviewFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      showErrorNotification('Sign In Required', 'Please sign in to leave a review');
      return;
    }

    // Validate input with schema
    const validation = validateWithSchema(reviewSchema, {
      title: title.trim() || undefined,
      content: content.trim(),
      rating,
    });

    if (isValidationError(validation)) {
      showErrorNotification('Validation Error', validation.error);
      return;
    }

    const validatedData = validation.data;

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('reviews').insert({
        user_id: user.id,
        product_id: productId || null,
        rating: validatedData.rating,
        title: validatedData.title || null,
        content: validatedData.content,
        is_verified_purchase: isVerifiedPurchase,
      });

      if (error) throw error;

      showSuccessNotification('Review Submitted!', 'It will be visible after approval');
      setRating(5);
      setTitle('');
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting review:', error);
      showErrorNotification('Submission Failed', 'Could not submit your review');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Please sign in to leave a review
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label className="mb-2 block">Rating</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-muted-foreground'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {productName && (
        <div className="text-sm text-muted-foreground">
          Reviewing: <span className="font-medium text-foreground">{productName}</span>
        </div>
      )}

      <div>
        <Label htmlFor="title">Title (optional)</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          maxLength={100}
        />
      </div>

      <div>
        <Label htmlFor="content">Your Review</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Tell us about your experience..."
          rows={4}
          maxLength={5000}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">{content.length}/5000 characters</p>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Submitting...' : 'Submit Review'}
      </Button>
    </form>
  );
}
