
-- Fix global_guard_guild_settings: Drop overly permissive policy and recreate for service_role only
DROP POLICY IF EXISTS "Service role full access" ON public.global_guard_guild_settings;

CREATE POLICY "Service role full access"
ON public.global_guard_guild_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix global_guard_subscriptions: Drop overly permissive policy and recreate for service_role only
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.global_guard_subscriptions;

CREATE POLICY "Service role can manage subscriptions"
ON public.global_guard_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
