
-- Re-enable RLS and add deny-all policies for anon/authenticated
-- (service_role bypasses RLS so it still has full access)

ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_audit_log_cursor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsfw_scan_cache ENABLE ROW LEVEL SECURITY;

-- Deny-all: authenticated users cannot access these internal tables
CREATE POLICY "Deny all for authenticated" ON public.ai_response_cache
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny all for authenticated" ON public.discord_audit_log_cursor
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny all for authenticated" ON public.discord_games
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny all for authenticated" ON public.nsfw_scan_cache
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
