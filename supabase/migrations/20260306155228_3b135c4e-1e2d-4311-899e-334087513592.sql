DROP INDEX IF EXISTS public.idx_products_description_trgm;
CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON public.products USING GIN (description extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_stores_name_trgm ON public.stores USING GIN (name extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_stores_description_trgm ON public.stores USING GIN (description extensions.gin_trgm_ops);