
-- 1. Webhook delivery logs table
CREATE TABLE public.webhook_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.seller_webhooks(id) ON DELETE CASCADE,
  event text NOT NULL,
  status_code int,
  response_body text,
  latency_ms int,
  attempt_number int NOT NULL DEFAULT 1,
  error_message text,
  payload_size_bytes int,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own webhook delivery logs"
  ON public.webhook_delivery_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.seller_webhooks sw
      JOIN public.stores s ON s.id = sw.store_id
      WHERE sw.id = webhook_delivery_logs.webhook_id
        AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all webhook delivery logs"
  ON public.webhook_delivery_logs FOR SELECT
  USING (public.has_permission(auth.uid(), 'manage_seller_stores'));

CREATE POLICY "Service role can insert webhook delivery logs"
  ON public.webhook_delivery_logs FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_webhook_delivery_logs_webhook_created
  ON public.webhook_delivery_logs(webhook_id, created_at DESC);

CREATE INDEX idx_webhook_delivery_logs_status
  ON public.webhook_delivery_logs(status_code)
  WHERE status_code >= 400;

-- 2. Audit log enrichment
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS action_category text;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_category ON public.audit_logs(action_category) WHERE action_category IS NOT NULL;

-- 3. Staff activity indexes
CREATE INDEX IF NOT EXISTS idx_staff_activity_user_created
  ON public.staff_activity(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_duty_logs_user_clock_in
  ON public.staff_duty_logs(user_id, clock_in DESC);

-- 4. Staff performance summary view
CREATE OR REPLACE VIEW public.staff_performance_summary AS
SELECT
  sa.user_id,
  p.display_name,
  p.staff_id,
  COUNT(CASE WHEN sa.activity_type = 'ticket_completed' THEN 1 END) AS tickets_resolved,
  COUNT(CASE WHEN sa.activity_type = 'ticket_claimed' THEN 1 END) AS tickets_claimed,
  COUNT(CASE WHEN sa.activity_type = 'chat_completed' THEN 1 END) AS chats_completed,
  COUNT(CASE WHEN sa.activity_type = 'chat_claimed' THEN 1 END) AS chats_claimed,
  COUNT(*) AS total_actions,
  COALESCE((
    SELECT SUM(dl.duration_minutes) / 60.0
    FROM public.staff_duty_logs dl
    WHERE dl.user_id = sa.user_id
      AND dl.clock_in >= now() - interval '30 days'
  ), 0) AS duty_hours_30d,
  MAX(sa.created_at) AS last_active_at
FROM public.staff_activity sa
JOIN public.profiles p ON p.user_id = sa.user_id
WHERE sa.created_at >= now() - interval '30 days'
GROUP BY sa.user_id, p.display_name, p.staff_id;
