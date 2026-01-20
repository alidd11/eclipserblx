-- Add columns for custom commission rate with expiration
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS custom_commission_rate numeric,
ADD COLUMN IF NOT EXISTS custom_rate_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS custom_rate_set_by uuid,
ADD COLUMN IF NOT EXISTS custom_rate_set_at timestamp with time zone;

-- Add index for efficient querying of expiring rates
CREATE INDEX IF NOT EXISTS idx_stores_custom_rate_expires 
ON public.stores(custom_rate_expires_at) 
WHERE custom_rate_expires_at IS NOT NULL;

-- Create function to revert expired custom rates
CREATE OR REPLACE FUNCTION public.revert_expired_custom_rates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.stores
  SET 
    custom_commission_rate = NULL,
    custom_rate_expires_at = NULL,
    custom_rate_set_by = NULL,
    custom_rate_set_at = NULL
  WHERE custom_rate_expires_at IS NOT NULL 
    AND custom_rate_expires_at <= now();
END;
$$;

-- Create a trigger function to check for expiration on store access
CREATE OR REPLACE FUNCTION public.check_custom_rate_expiration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.custom_rate_expires_at IS NOT NULL AND NEW.custom_rate_expires_at <= now() THEN
    NEW.custom_commission_rate := NULL;
    NEW.custom_rate_expires_at := NULL;
    NEW.custom_rate_set_by := NULL;
    NEW.custom_rate_set_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS check_custom_rate_expiration_trigger ON public.stores;
CREATE TRIGGER check_custom_rate_expiration_trigger
BEFORE UPDATE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.check_custom_rate_expiration();