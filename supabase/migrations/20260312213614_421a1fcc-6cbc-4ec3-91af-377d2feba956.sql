
-- Abandoned cart tracking
CREATE TABLE public.abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC NOT NULL DEFAULT 0,
  recovered BOOLEAN NOT NULL DEFAULT false,
  recovered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own abandoned carts" ON public.abandoned_carts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_abandoned_carts_user ON public.abandoned_carts (user_id);
CREATE INDEX idx_abandoned_carts_recovered ON public.abandoned_carts (recovered, updated_at);

-- Loyalty points system
CREATE TABLE public.loyalty_points (
  user_id UUID PRIMARY KEY,
  points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'bronze',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loyalty points" ON public.loyalty_points
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loyalty transactions" ON public.loyalty_transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_loyalty_tx_user ON public.loyalty_transactions (user_id, created_at DESC);

-- Function to add loyalty points
CREATE OR REPLACE FUNCTION public.add_loyalty_points(
  p_user_id UUID,
  p_points INTEGER,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.loyalty_points (user_id, points, lifetime_points)
  VALUES (p_user_id, p_points, GREATEST(p_points, 0))
  ON CONFLICT (user_id) DO UPDATE SET
    points = loyalty_points.points + p_points,
    lifetime_points = CASE WHEN p_points > 0 THEN loyalty_points.lifetime_points + p_points ELSE loyalty_points.lifetime_points END,
    tier = CASE
      WHEN (CASE WHEN p_points > 0 THEN loyalty_points.lifetime_points + p_points ELSE loyalty_points.lifetime_points END) >= 10000 THEN 'diamond'
      WHEN (CASE WHEN p_points > 0 THEN loyalty_points.lifetime_points + p_points ELSE loyalty_points.lifetime_points END) >= 5000 THEN 'gold'
      WHEN (CASE WHEN p_points > 0 THEN loyalty_points.lifetime_points + p_points ELSE loyalty_points.lifetime_points END) >= 1000 THEN 'silver'
      ELSE 'bronze'
    END,
    updated_at = now();

  INSERT INTO public.loyalty_transactions (user_id, points, type, description, reference_id)
  VALUES (p_user_id, p_points, p_type, p_description, p_reference_id);
END;
$$;

-- Seller discount campaigns
CREATE TABLE public.seller_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 80),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  product_ids UUID[] DEFAULT '{}',
  category_ids UUID[] DEFAULT '{}',
  apply_to_all BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners manage campaigns" ON public.seller_campaigns
  FOR ALL TO authenticated
  USING (public.is_store_owner(store_id, auth.uid()) OR public.is_store_team_member(store_id, auth.uid()))
  WITH CHECK (public.is_store_owner(store_id, auth.uid()) OR public.is_store_team_member(store_id, auth.uid()));

CREATE POLICY "Public can view active campaigns" ON public.seller_campaigns
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND starts_at <= now() AND ends_at > now());

-- Seller sales goals
CREATE TABLE public.seller_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  goal_type TEXT NOT NULL DEFAULT 'revenue',
  period TEXT NOT NULL DEFAULT 'monthly',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()),
  ends_at TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners manage goals" ON public.seller_goals
  FOR ALL TO authenticated
  USING (public.is_store_owner(store_id, auth.uid()) OR public.is_store_team_member(store_id, auth.uid()))
  WITH CHECK (public.is_store_owner(store_id, auth.uid()) OR public.is_store_team_member(store_id, auth.uid()));
