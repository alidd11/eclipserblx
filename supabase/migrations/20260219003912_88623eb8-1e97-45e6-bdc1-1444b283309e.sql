-- Notify seller when a new dispute/refund request is created
CREATE OR REPLACE FUNCTION public.notify_seller_new_dispute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_id UUID;
  v_customer_name TEXT;
BEGIN
  -- Get store owner
  SELECT owner_id INTO v_owner_id FROM public.stores WHERE id = NEW.store_id;
  
  -- Get customer name
  SELECT COALESCE(display_name, username, 'A customer') INTO v_customer_name
  FROM public.profiles WHERE user_id = NEW.customer_id;
  
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO public.seller_notifications (user_id, type, title, message, action_url)
    VALUES (
      v_owner_id,
      'refund_request',
      'New Dispute Filed',
      v_customer_name || ' has filed a dispute: ' || LEFT(COALESCE(NEW.reason, 'No reason given'), 80) || ' — £' || TO_CHAR(NEW.amount, 'FM999,999.00'),
      '/seller/refunds'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_refund_request_created
  AFTER INSERT ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_seller_new_dispute();
