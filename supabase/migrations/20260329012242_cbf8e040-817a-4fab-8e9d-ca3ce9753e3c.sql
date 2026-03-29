-- Add product_feed_channel_id to store_credentials for seller auto-feed
ALTER TABLE public.store_credentials
ADD COLUMN IF NOT EXISTS product_feed_channel_id text;

-- Create a function to call the notify-product-approved edge function
-- when a product's moderation_status changes to 'approved'
CREATE OR REPLACE FUNCTION public.notify_product_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
BEGIN
  -- Only fire when moderation_status changes to 'approved'
  IF NEW.moderation_status = 'approved' AND
     (OLD.moderation_status IS DISTINCT FROM 'approved') AND
     NEW.is_active = true THEN

    -- Use pg_net to call the edge function asynchronously
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-product-approved',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('productId', NEW.id::text)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on products table
DROP TRIGGER IF EXISTS trg_notify_product_approved ON public.products;
CREATE TRIGGER trg_notify_product_approved
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_product_approved();