
CREATE TABLE IF NOT EXISTS public.bot_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  context text NOT NULL,
  error_message text NOT NULL,
  stack_trace text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view bot error logs"
  ON public.bot_error_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert bot error logs"
  ON public.bot_error_logs
  FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_bot_error_logs_created_at ON public.bot_error_logs (created_at DESC);
CREATE INDEX idx_bot_error_logs_context ON public.bot_error_logs (context);
