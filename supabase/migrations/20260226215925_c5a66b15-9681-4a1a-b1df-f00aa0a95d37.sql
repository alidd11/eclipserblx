
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS pwyw_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.stores.pwyw_enabled IS 'Whether this store allows Pay What You Want pricing on products';
