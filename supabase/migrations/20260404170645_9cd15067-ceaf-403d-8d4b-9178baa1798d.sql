
-- 1. Create user_category_affinity table for personalisation
CREATE TABLE IF NOT EXISTS public.user_category_affinity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  affinity_score NUMERIC NOT NULL DEFAULT 0,
  interaction_count INT NOT NULL DEFAULT 0,
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id)
);

ALTER TABLE public.user_category_affinity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own affinity" ON public.user_category_affinity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own affinity" ON public.user_category_affinity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own affinity" ON public.user_category_affinity
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_user_category_affinity_user ON public.user_category_affinity(user_id);

-- 2. Function to update affinity (called on product view/purchase)
CREATE OR REPLACE FUNCTION public.update_category_affinity(
  p_user_id UUID,
  p_category_id UUID,
  p_weight NUMERIC DEFAULT 1.0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_category_affinity (user_id, category_id, affinity_score, interaction_count, last_interaction_at)
  VALUES (p_user_id, p_category_id, p_weight, 1, now())
  ON CONFLICT (user_id, category_id)
  DO UPDATE SET
    affinity_score = user_category_affinity.affinity_score + p_weight,
    interaction_count = user_category_affinity.interaction_count + 1,
    last_interaction_at = now();
END;
$$;

-- 3. Upgrade search_products_v2 with seller rating + personalisation
CREATE OR REPLACE FUNCTION public.search_products_v2(
  search_query TEXT DEFAULT '',
  category_filter TEXT DEFAULT NULL,
  min_price NUMERIC DEFAULT NULL,
  max_price NUMERIC DEFAULT NULL,
  free_only BOOLEAN DEFAULT false,
  sort_by TEXT DEFAULT 'relevance',
  page_size INT DEFAULT 20,
  page_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID, name TEXT, slug TEXT, price NUMERIC, images TEXT[],
  description TEXT, created_at TIMESTAMPTZ, total_sales INT, download_count INT,
  category_name TEXT, category_slug TEXT, store_name TEXT, store_slug TEXT,
  store_verified BOOLEAN, rank_score DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  tsq tsquery;
  max_sales NUMERIC;
  current_uid UUID;
BEGIN
  current_uid := auth.uid();

  IF search_query IS NOT NULL AND search_query != '' THEN
    BEGIN
      tsq := websearch_to_tsquery('english', search_query);
    EXCEPTION WHEN OTHERS THEN
      tsq := plainto_tsquery('english', search_query);
    END;
  END IF;

  SELECT COALESCE(MAX(p.total_sales), 1) INTO max_sales FROM products p WHERE p.is_active = true;

  RETURN QUERY
  SELECT
    p.id, p.name, p.slug, p.price, p.images, p.description, p.created_at,
    p.total_sales, p.download_count,
    c.name AS category_name, c.slug AS category_slug,
    s.name AS store_name, s.slug AS store_slug, s.is_verified AS store_verified,
    (
      -- RELEVANCE (35%): Full-text + trigram
      CASE
        WHEN search_query = '' OR search_query IS NULL THEN 0.5
        ELSE GREATEST(
          COALESCE(ts_rank_cd(p.search_vector, tsq, 32), 0) * 2.0,
          extensions.similarity(LOWER(p.name), LOWER(search_query)) * 0.8
        )
      END * 0.35
      -- SALES VOLUME (20%): Normalized against top seller
      + (COALESCE(p.total_sales, 0)::NUMERIC / max_sales) * 0.20
      -- CONVERSION RATIO (15%): Sales-to-download efficiency
      + LEAST(COALESCE(p.total_sales, 0)::NUMERIC / GREATEST(COALESCE(p.download_count, 1), 1), 1.0) * 0.15
      -- FRESHNESS (15%): 90-day linear decay
      + GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (NOW() - p.created_at)) / (90 * 86400)) * 0.15
      -- SELLER RATING (10%): Store verification + product rating
      + (
        CASE WHEN s.is_verified = true THEN 0.6 ELSE 0.3 END
        + LEAST(COALESCE(p.total_sales, 0)::NUMERIC / 50.0, 0.4)
      ) * 0.10
      -- PERSONALISATION BOOST (5%): Category affinity for logged-in users
      + CASE
          WHEN current_uid IS NOT NULL THEN
            COALESCE((
              SELECT LEAST(uca.affinity_score / 20.0, 1.0)
              FROM user_category_affinity uca
              WHERE uca.user_id = current_uid AND uca.category_id = p.category_id
            ), 0)
          ELSE 0.0
        END * 0.05
    )::DOUBLE PRECISION AS rank_score
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN stores s ON s.id = p.store_id
  WHERE p.is_active = true
    AND p.moderation_status = 'approved'
    AND (s.is_active IS NULL OR s.is_active = true)
    AND (s.is_testing IS NULL OR s.is_testing = false)
    AND (
      search_query = '' OR search_query IS NULL
      OR p.search_vector @@ tsq
      OR extensions.similarity(LOWER(p.name), LOWER(search_query)) > 0.15
      OR LOWER(p.name) ILIKE '%' || LOWER(search_query) || '%'
    )
    AND (category_filter IS NULL OR c.slug = category_filter)
    AND (min_price IS NULL OR p.price >= min_price)
    AND (max_price IS NULL OR p.price <= max_price)
    AND (free_only = false OR p.price = 0)
  ORDER BY
    CASE WHEN sort_by = 'price_asc' THEN p.price END ASC NULLS LAST,
    CASE WHEN sort_by = 'price_desc' THEN p.price END DESC NULLS LAST,
    CASE WHEN sort_by = 'newest' THEN EXTRACT(EPOCH FROM p.created_at) END DESC NULLS LAST,
    CASE WHEN sort_by = 'popular' THEN COALESCE(p.total_sales, 0) END DESC NULLS LAST,
    CASE WHEN sort_by = 'relevance' OR sort_by IS NULL THEN 1 ELSE 0 END DESC,
    rank_score DESC
  LIMIT page_size OFFSET page_offset;
END;
$$;
