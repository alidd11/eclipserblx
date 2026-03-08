
-- Price drop alerts: customers subscribe to be notified when wishlisted products drop in price
CREATE TABLE public.price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  target_price NUMERIC,
  original_price NUMERIC NOT NULL,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own alerts
CREATE POLICY "Users can view own alerts"
  ON public.price_alerts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own alerts"
  ON public.price_alerts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own alerts"
  ON public.price_alerts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all
CREATE POLICY "Admins can view all alerts"
  ON public.price_alerts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add starts_at to seller_discount_codes for scheduled activation
ALTER TABLE public.seller_discount_codes 
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_price_alerts_product ON public.price_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON public.price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_discount_codes_starts_at ON public.seller_discount_codes(starts_at) WHERE starts_at IS NOT NULL;
