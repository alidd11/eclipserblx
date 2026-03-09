
-- These tables are only accessed by service_role (edge functions / cron).
-- service_role bypasses RLS entirely, so RLS on these tables is pointless
-- and triggers linter warnings. Disabling RLS is the correct fix.

ALTER TABLE public.ai_response_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_audit_log_cursor DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_games DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsfw_scan_cache DISABLE ROW LEVEL SECURITY;
