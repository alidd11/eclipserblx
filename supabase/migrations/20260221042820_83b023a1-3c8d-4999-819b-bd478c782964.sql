
-- Product promotions table
CREATE TABLE public.product_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  slot_type TEXT NOT NULL CHECK (slot_type IN ('featured', 'category_spotlight')),
  category_id UUID REFERENCES public.categories(id),
  max_bid NUMERIC NOT NULL DEFAULT 5 CHECK (max_bid >= 5),
  current_bid NUMERIC NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending_auction' CHECK (status IN ('pending_auction', 'active', 'outbid', 'paused', 'expired', 'cancelled')),
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Promotion auctions log
CREATE TABLE public.promotion_auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_date DATE NOT NULL,
  slot_type TEXT NOT NULL CHECK (slot_type IN ('featured', 'category_spotlight')),
  category_id UUID REFERENCES public.categories(id),
  winners JSONB NOT NULL DEFAULT '[]',
  total_bids INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Promotion analytics (daily tracking)
CREATE TABLE public.promotion_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.product_promotions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(promotion_id, date)
);

-- Indexes
CREATE INDEX idx_product_promotions_store ON public.product_promotions(store_id);
CREATE INDEX idx_product_promotions_status ON public.product_promotions(status);
CREATE INDEX idx_product_promotions_slot_type ON public.product_promotions(slot_type, status);
CREATE INDEX idx_promotion_analytics_promotion ON public.promotion_analytics(promotion_id, date);
CREATE INDEX idx_promotion_auctions_date ON public.promotion_auctions(auction_date);

-- RLS
ALTER TABLE public.product_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_analytics ENABLE ROW LEVEL SECURITY;

-- Sellers can view their own promotions
CREATE POLICY "Sellers can view own promotions"
  ON public.product_promotions FOR SELECT
  USING (auth.uid() = user_id);

-- Sellers can insert their own promotions
CREATE POLICY "Sellers can create promotions"
  ON public.product_promotions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Sellers can update their own promotions
CREATE POLICY "Sellers can update own promotions"
  ON public.product_promotions FOR UPDATE
  USING (auth.uid() = user_id);

-- Staff can view all promotions
CREATE POLICY "Staff can view all promotions"
  ON public.product_promotions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Staff can update all promotions (for auction resolution)
CREATE POLICY "Staff can update all promotions"
  ON public.product_promotions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Active promotions are publicly readable (for marketplace display)
CREATE POLICY "Active promotions are public"
  ON public.product_promotions FOR SELECT
  USING (status = 'active');

-- Auction logs viewable by staff
CREATE POLICY "Staff can view auction logs"
  ON public.promotion_auctions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Auction logs insertable by service role (edge function)
CREATE POLICY "Service can insert auction logs"
  ON public.promotion_auctions FOR INSERT
  WITH CHECK (true);

-- Analytics viewable by promotion owner
CREATE POLICY "Owners can view promotion analytics"
  ON public.promotion_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.product_promotions pp
      WHERE pp.id = promotion_id AND pp.user_id = auth.uid()
    )
  );

-- Analytics insertable (for tracking)
CREATE POLICY "Service can insert analytics"
  ON public.promotion_analytics FOR INSERT
  WITH CHECK (true);

-- Staff can view all analytics
CREATE POLICY "Staff can view all analytics"
  ON public.promotion_analytics FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
