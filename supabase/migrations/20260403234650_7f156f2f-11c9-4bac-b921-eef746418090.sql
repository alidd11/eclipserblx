
-- Add free commission promo column to stores
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS free_commission_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add a comment for clarity
COMMENT ON COLUMN public.stores.free_commission_until IS 'When set, seller pays 0% commission until this date (new seller promo)';

-- Auto-set 30-day free commission when a store is approved for the first time
CREATE OR REPLACE FUNCTION public.set_new_seller_promo()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'approved' and free_commission_until is not already set
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') AND NEW.free_commission_until IS NULL THEN
    NEW.free_commission_until := NOW() + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trg_new_seller_promo ON public.stores;
CREATE TRIGGER trg_new_seller_promo
BEFORE UPDATE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.set_new_seller_promo();
