
-- 1. stores: hide sensitive financial columns from anonymous callers
REVOKE SELECT (total_revenue, commission_rate, custom_commission_rate, custom_rate_expires_at, custom_rate_set_by)
  ON public.stores FROM anon;

-- 2. store_domains: hide verification_token from anonymous callers
REVOKE SELECT (verification_token) ON public.store_domains FROM anon;

-- 3. seller_webhooks: staff should not read signing secrets. Drop the staff-wide SELECT policy.
--    Store owners retain full access via the existing "Store owners can manage their webhooks" FOR ALL policy.
DROP POLICY IF EXISTS "Staff with manage_seller_stores can view webhooks" ON public.seller_webhooks;

-- 4. profiles: tighten policy so only owner or staff with manage_users can view profile rows
--    (removes the broader view_users permission that was returning email addresses).
DROP POLICY IF EXISTS "Staff with permission can view all profiles" ON public.profiles;
CREATE POLICY "Owner or manage_users staff can view profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_permission(auth.uid(), 'manage_users'::text));

-- Ensure email column never leaks to anon
REVOKE SELECT (email) ON public.profiles FROM anon;
