-- Force moderation_status = 'pending' for any product that has a bot_products record
-- This ensures all bot listings require manual staff review before going live

CREATE OR REPLACE FUNCTION public.enforce_bot_product_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When a bot_products record is created/updated, force the linked product to pending review
  UPDATE public.products
  SET moderation_status = 'pending'
  WHERE id = NEW.product_id
    AND moderation_status != 'pending';
  
  RETURN NEW;
END;
$$;

-- Trigger on bot_products insert/update
CREATE TRIGGER enforce_bot_review_on_link
AFTER INSERT OR UPDATE ON public.bot_products
FOR EACH ROW
EXECUTE FUNCTION public.enforce_bot_product_review();

-- Also prevent direct approval bypass: if a product is linked to bot_products,
-- force it back to pending unless set by a staff member (service_role)
CREATE OR REPLACE FUNCTION public.prevent_bot_auto_approve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If product is being set to 'approved' and it's a bot product, keep it pending
  -- This only applies to non-service-role callers (i.e., sellers)
  IF NEW.moderation_status = 'approved' 
     AND (OLD.moderation_status IS NULL OR OLD.moderation_status != 'approved')
     AND EXISTS (SELECT 1 FROM public.bot_products WHERE product_id = NEW.id) THEN
    
    -- Check if caller is staff (has admin or moderator role)
    IF NOT public.has_role(auth.uid(), 'admin') 
       AND NOT public.has_role(auth.uid(), 'moderator') THEN
      NEW.moderation_status := 'pending';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_bot_auto_approve_trigger
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.prevent_bot_auto_approve();