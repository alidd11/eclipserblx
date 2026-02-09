
-- Drop overly permissive policy and replace with service-role-only write
DROP POLICY "Service role can manage translations" ON public.product_translations;

-- No insert/update/delete policies for anon/authenticated users
-- Only service_role (used by edge functions) bypasses RLS automatically
