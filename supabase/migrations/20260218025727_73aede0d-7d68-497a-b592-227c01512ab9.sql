
-- Auto-create notification when a new seller_transaction (sale) is inserted
CREATE OR REPLACE FUNCTION public.notify_seller_new_sale()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.type = 'sale' THEN
    INSERT INTO public.seller_notifications (store_id, type, title, message, link, metadata)
    VALUES (
      NEW.store_id,
      'new_order',
      'New Sale!',
      COALESCE(NEW.description, 'You received a new order') || ' — ' || 
        TO_CHAR(NEW.net_amount, 'FM£999,999.00') || ' earned',
      '/seller/orders',
      jsonb_build_object('order_id', NEW.order_id, 'amount', NEW.net_amount)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_seller_new_sale ON public.seller_transactions;
CREATE TRIGGER trg_notify_seller_new_sale
  AFTER INSERT ON public.seller_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_seller_new_sale();

-- Auto-create notification when a refund_request is created for a store
CREATE OR REPLACE FUNCTION public.notify_seller_refund_request()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.seller_notifications (store_id, type, title, message, link, metadata)
  VALUES (
    NEW.store_id,
    'refund_request',
    'Refund Request',
    'A customer has requested a refund: ' || LEFT(NEW.reason, 80),
    '/seller/refunds',
    jsonb_build_object('refund_request_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_seller_refund_request ON public.refund_requests;
CREATE TRIGGER trg_notify_seller_refund_request
  AFTER INSERT ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_seller_refund_request();

-- Auto-create notification when store gets a new follower
CREATE OR REPLACE FUNCTION public.notify_seller_new_follower()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_follower_name TEXT;
BEGIN
  SELECT COALESCE(display_name, username, 'Someone') INTO v_follower_name
  FROM public.profiles WHERE user_id = NEW.user_id;
  
  INSERT INTO public.seller_notifications (store_id, type, title, message, link)
  VALUES (
    NEW.store_id,
    'new_follower',
    'New Follower',
    v_follower_name || ' started following your store',
    '/seller/customers'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_seller_new_follower ON public.store_follows;
CREATE TRIGGER trg_notify_seller_new_follower
  AFTER INSERT ON public.store_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_seller_new_follower();
