-- Create bot license bundle pricing table
CREATE TABLE public.bot_license_bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_product_id UUID NOT NULL REFERENCES public.bot_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price_gbp NUMERIC(10, 2) NOT NULL,
  savings_percent INTEGER DEFAULT 0,
  label TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(bot_product_id, quantity)
);

-- Enable RLS
ALTER TABLE public.bot_license_bundles ENABLE ROW LEVEL SECURITY;

-- Public can view active bundles
CREATE POLICY "Anyone can view active bundles"
  ON public.bot_license_bundles
  FOR SELECT
  USING (is_active = true);

-- Staff can manage bundles
CREATE POLICY "Staff can manage bundles"
  ON public.bot_license_bundles
  FOR ALL
  USING (public.is_staff(auth.uid()));

-- Add index for lookups
CREATE INDEX idx_bot_license_bundles_product ON public.bot_license_bundles(bot_product_id) WHERE is_active = true;

-- Add trigger to update updated_at
CREATE TRIGGER update_bot_license_bundles_updated_at
  BEFORE UPDATE ON public.bot_license_bundles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();