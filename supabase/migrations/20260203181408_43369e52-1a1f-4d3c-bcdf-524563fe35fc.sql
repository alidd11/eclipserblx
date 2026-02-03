-- Add role ping columns for product drops to store_credentials
ALTER TABLE public.store_credentials
ADD COLUMN IF NOT EXISTS product_drops_role_id TEXT,
ADD COLUMN IF NOT EXISTS early_product_drops_role_id TEXT;