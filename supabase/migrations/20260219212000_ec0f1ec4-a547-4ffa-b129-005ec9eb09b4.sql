
-- 1. Backfill: assign 'seller' role to all approved store owners missing it
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT s.owner_id, 'seller'
FROM public.stores s
WHERE s.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = s.owner_id AND ur.role = 'seller'
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Create a trigger function to auto-assign 'seller' role when a store is approved
CREATE OR REPLACE FUNCTION public.assign_seller_role_on_store_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a store status changes to 'approved', assign the seller role
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.owner_id, 'seller')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Attach the trigger to the stores table
DROP TRIGGER IF EXISTS trigger_assign_seller_role_on_approval ON public.stores;
CREATE TRIGGER trigger_assign_seller_role_on_approval
AFTER INSERT OR UPDATE OF status ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.assign_seller_role_on_store_approval();
