-- Add GIN trigram index on product description for fast ILIKE search
CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON public.products USING GIN (description gin_trgm_ops);

-- Add GIN trigram index on store name for fast store search
CREATE INDEX IF NOT EXISTS idx_stores_name_trgm ON public.stores USING GIN (name extensions.gin_trgm_ops);

-- Add GIN trigram index on store description
CREATE INDEX IF NOT EXISTS idx_stores_description_trgm ON public.stores USING GIN (description extensions.gin_trgm_ops);