
-- Add seller reply columns to reviews table
ALTER TABLE public.reviews 
  ADD COLUMN IF NOT EXISTS seller_reply TEXT,
  ADD COLUMN IF NOT EXISTS seller_replied_at TIMESTAMP WITH TIME ZONE;

-- RLS policy: sellers can update seller_reply on reviews for their products
CREATE POLICY "Sellers can reply to reviews on their products"
  ON public.reviews
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      WHERE p.id = reviews.product_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      WHERE p.id = reviews.product_id AND s.owner_id = auth.uid()
    )
  );
