
-- Fix discord_daily_claims: change ALL policy from {public} to service_role
DROP POLICY IF EXISTS "Service role can manage daily_claims" ON public.discord_daily_claims;
CREATE POLICY "Service role can manage daily_claims"
  ON public.discord_daily_claims
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix discord_games: change ALL policy from {public} to service_role
DROP POLICY IF EXISTS "Service role can manage games" ON public.discord_games;
CREATE POLICY "Service role can manage games"
  ON public.discord_games
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix discord_xp: change ALL policy from {public} to service_role
DROP POLICY IF EXISTS "Service role can manage discord_xp" ON public.discord_xp;
CREATE POLICY "Service role can manage discord_xp"
  ON public.discord_xp
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix ip_copy_detections: restrict INSERT to service_role
DROP POLICY IF EXISTS "Service role can insert copy detections" ON public.ip_copy_detections;
CREATE POLICY "Service role can insert copy detections"
  ON public.ip_copy_detections
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Fix promotion_analytics: restrict INSERT to service_role
DROP POLICY IF EXISTS "Service can insert analytics" ON public.promotion_analytics;
CREATE POLICY "Service role can insert analytics"
  ON public.promotion_analytics
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Fix promotion_auctions: restrict INSERT to service_role
DROP POLICY IF EXISTS "Service can insert auction logs" ON public.promotion_auctions;
CREATE POLICY "Service role can insert auction logs"
  ON public.promotion_auctions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add service_role policies to tables with RLS but no policies
-- ai_response_cache: service_role only
CREATE POLICY "Service role full access"
  ON public.ai_response_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- discord_audit_log_cursor: service_role only
CREATE POLICY "Service role full access"
  ON public.discord_audit_log_cursor
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- discord_outreach_activity: staff access for SELECT, service_role for writes
CREATE POLICY "Staff can view outreach activity"
  ON public.discord_outreach_activity
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lead_administrator'));

CREATE POLICY "Service role can manage outreach activity"
  ON public.discord_outreach_activity
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ip_bans: service_role only (edge functions manage bans)
CREATE POLICY "Service role full access"
  ON public.ip_bans
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Staff can view bans
CREATE POLICY "Staff can view IP bans"
  ON public.ip_bans
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lead_administrator'));

-- nsfw_scan_cache: service_role only
CREATE POLICY "Service role full access"
  ON public.nsfw_scan_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- staff_id_logs: staff can view, service_role can manage
CREATE POLICY "Staff can view staff ID logs"
  ON public.staff_id_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lead_administrator'));

CREATE POLICY "Service role can manage staff ID logs"
  ON public.staff_id_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- staff_notes: staff can manage their own notes
CREATE POLICY "Staff can view all notes"
  ON public.staff_notes
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lead_administrator'));

CREATE POLICY "Staff can create notes"
  ON public.staff_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lead_administrator'));

CREATE POLICY "Service role can manage staff notes"
  ON public.staff_notes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
