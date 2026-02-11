
ALTER TABLE public.stores ADD COLUMN eclipse_plus_discount_enabled boolean NOT NULL DEFAULT true;

-- Third-party seller stores default to true (opted in), admin can toggle off
COMMENT ON COLUMN public.stores.eclipse_plus_discount_enabled IS 'Whether Eclipse+ member discounts apply to this store products';
