
-- 1. Tighten profiles staff SELECT policy: require view_users or manage_users permission
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
CREATE POLICY "Staff with permission can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_permission(auth.uid(), 'view_users')
    OR public.has_permission(auth.uid(), 'manage_users')
  );

-- Remove the old "Users can view their own profile" since it's now merged above
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- 2. Add staff SELECT policy for store_payment_details (restricted to manage_seller_stores permission)
CREATE POLICY "Staff with permission can view store payment details"
  ON public.store_payment_details
  FOR SELECT
  TO authenticated
  USING (
    public.has_permission(auth.uid(), 'manage_seller_stores')
  );
