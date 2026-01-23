-- Add verified purchase column to reviews table
ALTER TABLE public.reviews 
ADD COLUMN is_verified_purchase boolean DEFAULT false;

-- Create index for filtering by verified purchases
CREATE INDEX idx_reviews_verified_purchase ON public.reviews(is_verified_purchase) WHERE is_verified_purchase = true;