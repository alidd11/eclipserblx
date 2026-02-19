
-- Add details_submitted column to track onboarding completion
ALTER TABLE public.store_payment_details 
ADD COLUMN IF NOT EXISTS details_submitted boolean DEFAULT false;

-- Drop old trigger
DROP TRIGGER IF EXISTS sync_trusted_on_stripe_connect ON public.store_payment_details;

-- Replace function to sync is_verified based on onboarding completion
CREATE OR REPLACE FUNCTION public.sync_trusted_status_from_stripe()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Admin-managed stores are always verified
  IF NEW.store_id IN ('83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a', '9b842052-e1fd-4dfe-99bf-c7625df3e17d') THEN
    UPDATE public.stores SET is_verified = true WHERE id = NEW.store_id;
    RETURN NEW;
  END IF;

  -- Set verified based on Stripe Connect onboarding completion
  IF NEW.details_submitted = true THEN
    UPDATE public.stores SET is_verified = true WHERE id = NEW.store_id;
  ELSE
    UPDATE public.stores SET is_verified = false WHERE id = NEW.store_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger on store_payment_details
CREATE TRIGGER sync_verified_on_stripe_onboarding
  AFTER INSERT OR UPDATE ON public.store_payment_details
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_trusted_status_from_stripe();
