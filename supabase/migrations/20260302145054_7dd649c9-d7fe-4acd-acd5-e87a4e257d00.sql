-- Add GIN trigram index for fast ILIKE text search on products
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON public.products USING GIN (description gin_trgm_ops);

-- Add index for product slug lookups (used by product detail page)
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug) WHERE is_active = true;

-- Add index for store slug lookups
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores (slug) WHERE is_active = true;

-- Add index for order lookups by user
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON public.orders (user_id, status);

-- Add index for review lookups by product
CREATE INDEX IF NOT EXISTS idx_reviews_product_approved ON public.reviews (product_id) WHERE is_approved = true;