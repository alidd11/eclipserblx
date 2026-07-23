
CREATE OR REPLACE FUNCTION public.notify_product_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_base_url text;
  v_key text;
BEGIN
  IF NEW.moderation_status = 'approved'
     AND (OLD.moderation_status IS DISTINCT FROM 'approved')
     AND NEW.is_active = true THEN

    v_base_url := current_setting('app.settings.supabase_url', true);
    v_key := current_setting('app.settings.service_role_key', true);

    -- If the DB settings aren't configured, skip the async notification
    -- rather than aborting the UPDATE. The client-side approve flow already
    -- invokes send-product-drop-webhook directly, so no notification is lost.
    IF v_base_url IS NULL OR v_base_url = '' OR v_key IS NULL OR v_key = '' THEN
      RETURN NEW;
    END IF;

    BEGIN
      PERFORM net.http_post(
        url := v_base_url || '/functions/v1/notify-product-approved',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := jsonb_build_object('productId', NEW.id::text)
      );
    EXCEPTION WHEN OTHERS THEN
      -- Never let a notification failure block product approval
      RAISE WARNING 'notify_product_approved failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;
