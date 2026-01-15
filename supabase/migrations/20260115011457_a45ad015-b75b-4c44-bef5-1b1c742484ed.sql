-- Add release_at column to products table for scheduled releases
ALTER TABLE public.products 
ADD COLUMN release_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add an index for efficient filtering on release_at
CREATE INDEX idx_products_release_at ON public.products(release_at) WHERE release_at IS NOT NULL;