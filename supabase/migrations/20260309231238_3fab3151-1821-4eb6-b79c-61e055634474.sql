
-- Fix 1: Add RLS policies to ad_ping_purchase_log (internal dedup table, no direct user access needed)
CREATE POLICY "Service role only" ON public.ad_ping_purchase_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Fix 2: Add RLS policies to processed_webhook_events (internal dedup table, no direct user access)  
CREATE POLICY "Service role only" ON public.processed_webhook_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Fix 3: Remove redundant "Service role" USING(true) policies.
-- The service_role BYPASSES RLS entirely, so these policies are dead code that triggers linter warnings.
-- Dropping them has zero functional impact since service_role ignores RLS regardless.

DROP POLICY IF EXISTS "Service role can manage server usage" ON public.global_guard_server_usage;
DROP POLICY IF EXISTS "Service role full access" ON public.global_guard_guild_settings;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.global_guard_subscriptions;
DROP POLICY IF EXISTS "Service role can manage daily_claims" ON public.discord_daily_claims;
DROP POLICY IF EXISTS "Service role can manage games" ON public.discord_games;
DROP POLICY IF EXISTS "Service role can manage discord_xp" ON public.discord_xp;
DROP POLICY IF EXISTS "Service role full access" ON public.ai_response_cache;
DROP POLICY IF EXISTS "Service role full access" ON public.discord_audit_log_cursor;
DROP POLICY IF EXISTS "Service role can manage outreach activity" ON public.discord_outreach_activity;
DROP POLICY IF EXISTS "Service role full access" ON public.ip_bans;
DROP POLICY IF EXISTS "Service role full access" ON public.nsfw_scan_cache;
DROP POLICY IF EXISTS "Service role can manage staff ID logs" ON public.staff_id_logs;
DROP POLICY IF EXISTS "Service role can manage staff notes" ON public.staff_notes;
DROP POLICY IF EXISTS "Service role manages download tokens" ON public.download_tokens;
DROP POLICY IF EXISTS "Service role manages verifications" ON public.identity_verifications;

-- Fix 4: Replace the overly-permissive consent_records INSERT policy with a proper one
DROP POLICY IF EXISTS "Anyone can record consent" ON public.consent_records;
CREATE POLICY "Anyone can record consent" ON public.consent_records
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    visitor_id IS NOT NULL 
    AND length(visitor_id) > 0
    AND length(visitor_id) < 200
  );
