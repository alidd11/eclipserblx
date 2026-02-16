
-- Update the trigger function to never remove trusted from admin-managed stores
CREATE OR REPLACE FUNCTION public.sync_trusted_status_from_stripe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Never remove trusted from admin-managed stores (Eclipse & Vino)
  IF NEW.store_id IN ('83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a', '9b842052-e1fd-4dfe-99bf-c7625df3e17d') THEN
    UPDATE public.stores SET is_trusted = true WHERE id = NEW.store_id;
    RETURN NEW;
  END IF;

  -- For all other stores, set trusted based on Stripe Connect status
  IF NEW.stripe_account_id IS NOT NULL AND NEW.stripe_account_id != '' THEN
    UPDATE public.stores SET is_trusted = true WHERE id = NEW.store_id;
  ELSE
    UPDATE public.stores SET is_trusted = false WHERE id = NEW.store_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure Eclipse & Vino are trusted right now
UPDATE public.stores SET is_trusted = true 
WHERE id IN ('83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a', '9b842052-e1fd-4dfe-99bf-c7625df3e17d');
