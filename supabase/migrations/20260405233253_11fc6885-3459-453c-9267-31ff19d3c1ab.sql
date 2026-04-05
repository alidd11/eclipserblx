
-- 1. Order reconciliation trigger: auto-link orphaned orders by email
CREATE OR REPLACE FUNCTION public.reconcile_order_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Only act if user_id is null but customer_email is present
  IF NEW.user_id IS NULL AND NEW.customer_email IS NOT NULL AND NEW.customer_email != '' THEN
    SELECT p.user_id INTO v_user_id
    FROM public.profiles p
    WHERE LOWER(p.email) = LOWER(NEW.customer_email)
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      NEW.user_id := v_user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reconcile_order_user
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.reconcile_order_user();

-- 2. Backfill existing orphaned orders
UPDATE public.orders o
SET user_id = p.user_id
FROM public.profiles p
WHERE o.user_id IS NULL
  AND o.customer_email IS NOT NULL
  AND o.customer_email != ''
  AND LOWER(o.customer_email) = LOWER(p.email);
