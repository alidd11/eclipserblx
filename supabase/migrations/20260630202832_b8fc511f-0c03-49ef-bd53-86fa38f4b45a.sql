
CREATE TABLE IF NOT EXISTS public.orion_event_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  delivered_at timestamptz,
  dead_lettered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  next_attempt_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orion_event_outbox_pending_idx
  ON public.orion_event_outbox (next_attempt_at)
  WHERE delivered_at IS NULL AND dead_lettered_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.orion_event_outbox TO service_role;
GRANT SELECT ON public.orion_event_outbox TO authenticated;
ALTER TABLE public.orion_event_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orion_outbox_service_all" ON public.orion_event_outbox
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "orion_outbox_admin_read" ON public.orion_event_outbox
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.orion_inbound_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  signature_valid boolean,
  status text NOT NULL DEFAULT 'pending',
  result jsonb,
  error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz
);
CREATE INDEX IF NOT EXISTS orion_inbound_commands_status_idx
  ON public.orion_inbound_commands (status, received_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.orion_inbound_commands TO service_role;
GRANT SELECT ON public.orion_inbound_commands TO authenticated;
ALTER TABLE public.orion_inbound_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orion_inbound_service_all" ON public.orion_inbound_commands
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "orion_inbound_admin_read" ON public.orion_inbound_commands
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.orion_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE,
  proposing_agent text NOT NULL,
  board_meeting_id text,
  title text NOT NULL,
  rationale text NOT NULL,
  category text NOT NULL CHECK (category IN ('copy','feature_flag','pricing','notification_template','cron_toggle','schema','code','other')),
  risk_level text NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high','critical')),
  proposal jsonb NOT NULL DEFAULT '{}'::jsonb,
  transcript jsonb,
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','rejected','applied','failed','withdrawn')),
  decision_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  applied_at timestamptz,
  apply_result jsonb,
  apply_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orion_change_requests_status_idx
  ON public.orion_change_requests (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.orion_change_requests TO authenticated;
GRANT ALL ON public.orion_change_requests TO service_role;
ALTER TABLE public.orion_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orion_cr_admin_read" ON public.orion_change_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "orion_cr_admin_update" ON public.orion_change_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER orion_change_requests_set_updated_at
  BEFORE UPDATE ON public.orion_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.orion_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  title text NOT NULL,
  root_cause text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  resolution text,
  status text NOT NULL DEFAULT 'open',
  raised_by text,
  related_migration text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orion_findings_status_idx ON public.orion_findings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS orion_findings_kind_idx ON public.orion_findings (kind);

GRANT SELECT, INSERT, UPDATE ON public.orion_findings TO authenticated;
GRANT ALL ON public.orion_findings TO service_role;
ALTER TABLE public.orion_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orion_findings_admin_read" ON public.orion_findings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "orion_findings_admin_manage" ON public.orion_findings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER orion_findings_set_updated_at
  BEFORE UPDATE ON public.orion_findings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.orion_admin_send_ping()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  INSERT INTO public.orion_event_outbox (event_type, payload)
  VALUES ('ops.ping', jsonb_build_object('reason','admin_panel_test','at', now()))
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.orion_admin_send_ping() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.orion_admin_send_ping() TO authenticated;
