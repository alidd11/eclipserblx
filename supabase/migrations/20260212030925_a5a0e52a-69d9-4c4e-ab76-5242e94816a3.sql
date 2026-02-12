
-- Add consent tracking columns to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS file_review_consented_at timestamptz,
ADD COLUMN IF NOT EXISTS file_review_requested_at timestamptz;

-- Create seller_notifications table
CREATE TABLE public.seller_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'file_review',
  title text NOT NULL,
  message text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  action_url text,
  read_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_notifications ENABLE ROW LEVEL SECURITY;

-- Sellers can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON public.seller_notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Sellers can update (acknowledge) their own notifications
CREATE POLICY "Users can update own notifications"
ON public.seller_notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Service role / edge functions can insert notifications
CREATE POLICY "Staff can insert notifications"
ON public.seller_notifications FOR INSERT
TO authenticated
WITH CHECK (
  public.is_staff(auth.uid())
);

-- Staff can view all notifications for admin purposes
CREATE POLICY "Staff can view all notifications"
ON public.seller_notifications FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Create the consent check function for storage policies
CREATE OR REPLACE FUNCTION public.product_file_review_consented(file_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.products
    WHERE asset_file_url = file_path
      AND file_review_consented_at IS NOT NULL
  )
$$;

-- Drop the existing broad staff access policy on product-assets
DROP POLICY IF EXISTS "Staff can manage product assets" ON storage.objects;
DROP POLICY IF EXISTS "Staff can view product assets" ON storage.objects;

-- Replace with consent-gated staff access
CREATE POLICY "Staff can access consented product assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-assets'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'lead_administrator')
  )
  AND public.product_file_review_consented(name)
);

-- Index for faster consent lookups
CREATE INDEX IF NOT EXISTS idx_products_file_review_consent 
ON public.products (asset_file_url) 
WHERE file_review_consented_at IS NOT NULL;

-- Index for seller notifications
CREATE INDEX IF NOT EXISTS idx_seller_notifications_user 
ON public.seller_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seller_notifications_product 
ON public.seller_notifications (product_id);

-- Enable realtime for seller_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_notifications;
