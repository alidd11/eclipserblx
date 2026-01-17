-- Add Robux payment tracking fields to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS robux_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS robux_product_id text,
ADD COLUMN IF NOT EXISTS robux_price integer;

-- Add comment for clarity
COMMENT ON COLUMN public.products.robux_enabled IS 'Whether this product is available for Robux payment';
COMMENT ON COLUMN public.products.robux_product_id IS 'The Roblox Developer Product ID';
COMMENT ON COLUMN public.products.robux_price IS 'Price in Robux';