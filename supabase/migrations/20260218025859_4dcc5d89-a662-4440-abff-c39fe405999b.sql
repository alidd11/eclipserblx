
-- Drop the triggers that reference non-existent columns (store_id, link, is_read)
DROP TRIGGER IF EXISTS trg_notify_seller_new_sale ON public.seller_transactions;
DROP TRIGGER IF EXISTS trg_notify_seller_refund_request ON public.refund_requests;
DROP TRIGGER IF EXISTS trg_notify_seller_new_follower ON public.store_follows;

-- Recreate functions using existing seller_notifications schema (user_id, action_url, read_at)
CREATE OR REPLACE FUNCTION public.notify_seller_new_sale()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.type = 'sale' THEN
    INSERT INTO public.seller_notifications (user_id, type, title, message, action_url)
    VALUES (
      NEW.seller_id,
      'new_order',
      'New Sale!',
      COALESCE(NEW.description, 'You received a new order') || ' — ' || 
        TO_CHAR(NEW.net_amount, 'FM£999,999.00') || ' earned',
      '/seller/orders'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_seller_new_sale
  AFTER INSERT ON public.seller_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_seller_new_sale();

-- Refund request trigger - need to get the store owner's user_id
CREATE OR REPLACE FUNCTION public.notify_seller_refund_request()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id FROM public.stores WHERE id = NEW.store_id;
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO public.seller_notifications (user_id, type, title, message, action_url)
    VALUES (
      v_owner_id,
      'refund_request',
      'Refund Request',
      'A customer has requested a refund: ' || LEFT(NEW.reason, 80),
      '/seller/refunds'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_seller_refund_request
  AFTER INSERT ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_seller_refund_request();

-- New follower trigger
CREATE OR REPLACE FUNCTION public.notify_seller_new_follower()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_follower_name TEXT;
  v_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id FROM public.stores WHERE id = NEW.store_id;
  SELECT COALESCE(display_name, username, 'Someone') INTO v_follower_name
  FROM public.profiles WHERE user_id = NEW.user_id;
  
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO public.seller_notifications (user_id, type, title, message, action_url)
    VALUES (
      v_owner_id,
      'new_follower',
      'New Follower',
      v_follower_name || ' started following your store',
      '/seller/customers'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_seller_new_follower
  AFTER INSERT ON public.store_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_seller_new_follower();
