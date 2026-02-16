
-- Create function to auto-set is_trusted based on Stripe Connect status
CREATE OR REPLACE FUNCTION public.sync_trusted_status_from_stripe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If stripe_account_id is set (not null/empty), mark store as trusted
  IF NEW.stripe_account_id IS NOT NULL AND NEW.stripe_account_id != '' THEN
    UPDATE public.stores SET is_trusted = true WHERE id = NEW.store_id;
  ELSE
    UPDATE public.stores SET is_trusted = false WHERE id = NEW.store_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on store_payment_details
CREATE TRIGGER sync_trusted_on_stripe_connect
AFTER INSERT OR UPDATE OF stripe_account_id ON public.store_payment_details
FOR EACH ROW
EXECUTE FUNCTION public.sync_trusted_status_from_stripe();

-- Sync existing stores: set is_trusted based on current stripe_account_id
UPDATE public.stores s
SET is_trusted = EXISTS (
  SELECT 1 FROM public.store_payment_details spd
  WHERE spd.store_id = s.id
    AND spd.stripe_account_id IS NOT NULL
    AND spd.stripe_account_id != ''
);
