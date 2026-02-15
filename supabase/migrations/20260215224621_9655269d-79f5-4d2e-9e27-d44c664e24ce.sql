-- Add store_id to discount_codes so codes can be scoped to a specific store
ALTER TABLE public.discount_codes
ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX idx_discount_codes_store_id ON public.discount_codes(store_id);

-- Add comment
COMMENT ON COLUMN public.discount_codes.store_id IS 'Optional: scopes this discount code to a specific store''s products only';