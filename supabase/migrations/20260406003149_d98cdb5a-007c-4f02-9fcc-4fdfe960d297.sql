
-- Seller webhooks table
CREATE TABLE public.seller_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  last_status_code INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can manage their webhooks"
  ON public.seller_webhooks FOR ALL
  TO authenticated
  USING (public.is_store_owner(store_id, auth.uid()))
  WITH CHECK (public.is_store_owner(store_id, auth.uid()));

CREATE POLICY "Staff can view all webhooks"
  ON public.seller_webhooks FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- Webhook delivery logs
CREATE TABLE public.seller_webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES public.seller_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status_code INTEGER,
  response_body TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view their webhook logs"
  ON public.seller_webhook_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.seller_webhooks sw
      WHERE sw.id = webhook_id
        AND public.is_store_owner(sw.store_id, auth.uid())
    )
  );

CREATE POLICY "Staff can view all webhook logs"
  ON public.seller_webhook_logs FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_seller_webhooks_store_id ON public.seller_webhooks(store_id);
CREATE INDEX idx_seller_webhook_logs_webhook_id ON public.seller_webhook_logs(webhook_id);
CREATE INDEX idx_seller_webhook_logs_created_at ON public.seller_webhook_logs(created_at DESC);
