-- Add max download limit to products (null = unlimited)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS max_downloads_per_purchase integer DEFAULT NULL;

-- Add per-purchase download count to order_items
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS download_count integer NOT NULL DEFAULT 0;