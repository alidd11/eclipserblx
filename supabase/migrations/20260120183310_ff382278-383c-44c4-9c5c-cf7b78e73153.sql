-- Add enhanced store customization fields
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS hero_title TEXT,
ADD COLUMN IF NOT EXISTS hero_subtitle TEXT,
ADD COLUMN IF NOT EXISTS hero_cta_text TEXT DEFAULT 'Browse Products',
ADD COLUMN IF NOT EXISTS hero_cta_link TEXT,
ADD COLUMN IF NOT EXISTS custom_css TEXT,
ADD COLUMN IF NOT EXISTS font_heading TEXT DEFAULT 'inter',
ADD COLUMN IF NOT EXISTS font_body TEXT DEFAULT 'inter',
ADD COLUMN IF NOT EXISTS announcement_text TEXT,
ADD COLUMN IF NOT EXISTS announcement_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS featured_product_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS layout_style TEXT DEFAULT 'grid',
ADD COLUMN IF NOT EXISTS show_reviews BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_social_proof BOOLEAN DEFAULT TRUE;

-- Create seller discount codes table
CREATE TABLE IF NOT EXISTS public.seller_discount_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  max_discount_percent NUMERIC DEFAULT 50 CHECK (max_discount_percent <= 50),
  min_order_amount NUMERIC DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  product_ids TEXT[],
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, code)
);

-- Create seller analytics table for tracking views and conversions
CREATE TABLE IF NOT EXISTS public.seller_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('store_view', 'product_view', 'add_to_cart', 'checkout', 'purchase')),
  visitor_id TEXT,
  referrer TEXT,
  device_type TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_seller_analytics_store_date ON public.seller_analytics(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_analytics_product ON public.seller_analytics(product_id, created_at DESC);

-- Enable RLS on new tables
ALTER TABLE public.seller_discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for seller_discount_codes (using owner_id)
CREATE POLICY "Sellers can view their own discount codes"
ON public.seller_discount_codes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = seller_discount_codes.store_id
    AND stores.owner_id = auth.uid()
  )
);

CREATE POLICY "Sellers can create their own discount codes"
ON public.seller_discount_codes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = seller_discount_codes.store_id
    AND stores.owner_id = auth.uid()
  )
);

CREATE POLICY "Sellers can update their own discount codes"
ON public.seller_discount_codes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = seller_discount_codes.store_id
    AND stores.owner_id = auth.uid()
  )
);

CREATE POLICY "Sellers can delete their own discount codes"
ON public.seller_discount_codes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = seller_discount_codes.store_id
    AND stores.owner_id = auth.uid()
  )
);

-- Public read access for active discount codes (for checkout validation)
CREATE POLICY "Anyone can validate active discount codes"
ON public.seller_discount_codes
FOR SELECT
USING (is_active = true);

-- RLS policies for seller_analytics (using owner_id)
CREATE POLICY "Sellers can view their own analytics"
ON public.seller_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = seller_analytics.store_id
    AND stores.owner_id = auth.uid()
  )
);

CREATE POLICY "Anyone can insert analytics events"
ON public.seller_analytics
FOR INSERT
WITH CHECK (true);

-- Admin access policies
CREATE POLICY "Admins can manage all discount codes"
ON public.seller_discount_codes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.staff_id IS NOT NULL
  )
);

CREATE POLICY "Admins can view all analytics"
ON public.seller_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.staff_id IS NOT NULL
  )
);

-- Enable realtime for analytics
ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_analytics;