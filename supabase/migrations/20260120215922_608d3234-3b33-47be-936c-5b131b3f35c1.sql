-- ==========================================
-- CREATOR FOLLOWING SYSTEM
-- ==========================================

-- Table for user follows (following stores/sellers)
CREATE TABLE public.store_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notify_new_products BOOLEAN DEFAULT true,
  notify_discounts BOOLEAN DEFAULT true,
  UNIQUE(user_id, store_id)
);

-- Enable RLS
ALTER TABLE public.store_follows ENABLE ROW LEVEL SECURITY;

-- Users can view their own follows
CREATE POLICY "Users can view own follows"
  ON public.store_follows FOR SELECT
  USING (auth.uid() = user_id);

-- Users can follow stores
CREATE POLICY "Users can follow stores"
  ON public.store_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their follow preferences
CREATE POLICY "Users can update own follows"
  ON public.store_follows FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can unfollow stores
CREATE POLICY "Users can unfollow stores"
  ON public.store_follows FOR DELETE
  USING (auth.uid() = user_id);

-- Add follower count to stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;

-- Function to update follower count
CREATE OR REPLACE FUNCTION public.update_store_follower_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE stores SET follower_count = follower_count + 1 WHERE id = NEW.store_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE stores SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.store_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger to auto-update follower count
CREATE TRIGGER update_follower_count_trigger
AFTER INSERT OR DELETE ON public.store_follows
FOR EACH ROW
EXECUTE FUNCTION public.update_store_follower_count();

-- ==========================================
-- AI SEARCH LOGS (for improving recommendations)
-- ==========================================

CREATE TABLE public.search_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  clicked_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- Public insert for anonymous search logging
CREATE POLICY "Anyone can log searches"
  ON public.search_logs FOR INSERT
  WITH CHECK (true);

-- Staff can view search logs for analytics
CREATE POLICY "Staff can view search logs"
  ON public.search_logs FOR SELECT
  USING (is_staff(auth.uid()));

-- ==========================================
-- PRODUCT VIEW HISTORY (for recommendations)
-- ==========================================

CREATE TABLE public.product_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  view_count INTEGER DEFAULT 1,
  last_viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

-- Users can view their own history
CREATE POLICY "Users can view own product views"
  ON public.product_views FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert/update their views
CREATE POLICY "Users can track product views"
  ON public.product_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own views"
  ON public.product_views FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_store_follows_user ON public.store_follows(user_id);
CREATE INDEX idx_store_follows_store ON public.store_follows(store_id);
CREATE INDEX idx_product_views_user ON public.product_views(user_id);
CREATE INDEX idx_search_logs_user ON public.search_logs(user_id);
CREATE INDEX idx_search_logs_created ON public.search_logs(created_at DESC);