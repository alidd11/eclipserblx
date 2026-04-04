
-- 1. Add tsvector column with GIN index
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_products_search_vector ON public.products USING GIN (search_vector);

-- 2. search_products_v2 RPC
CREATE OR REPLACE FUNCTION public.search_products_v2(
  search_query text DEFAULT '',
  category_filter text DEFAULT NULL,
  min_price numeric DEFAULT NULL,
  max_price numeric DEFAULT NULL,
  free_only boolean DEFAULT false,
  sort_by text DEFAULT 'relevance',
  page_size integer DEFAULT 20,
  page_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, name text, slug text, price numeric, images text[],
  description text, created_at timestamptz, total_sales integer,
  download_count integer, category_name text, category_slug text,
  store_name text, store_slug text, store_verified boolean,
  rank_score double precision
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  tsq tsquery;
  max_sales NUMERIC;
BEGIN
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
      CASE
        WHEN search_query = '' OR search_query IS NULL THEN 0.5
        ELSE GREATEST(
          COALESCE(ts_rank_cd(p.search_vector, tsq, 32), 0) * 2.0,
          extensions.similarity(LOWER(p.name), LOWER(search_query)) * 0.8
        )
      END * 0.40
      + (COALESCE(p.total_sales, 0)::NUMERIC / max_sales) * 0.20
      + LEAST(COALESCE(p.total_sales, 0)::NUMERIC / GREATEST(COALESCE(p.download_count, 1), 1), 1.0) * 0.15
      + GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (NOW() - p.created_at)) / (90 * 86400)) * 0.15
      + 0.5 * 0.10
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

-- 3. Popular searches materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.popular_searches AS
  SELECT 
    lower(trim(query)) as term, 
    count(*) as search_count,
    max(created_at) as last_searched
  FROM public.search_logs
  WHERE created_at > now() - interval '30 days'
    AND query IS NOT NULL
    AND length(trim(query)) >= 2
  GROUP BY lower(trim(query))
  HAVING count(*) >= 2
  ORDER BY count(*) DESC
  LIMIT 200;

CREATE UNIQUE INDEX IF NOT EXISTS idx_popular_searches_term ON public.popular_searches (term);

-- 4. Spell correction function
CREATE OR REPLACE FUNCTION public.suggest_correction(search_query text)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  suggestion text;
BEGIN
  IF search_query IS NULL OR length(trim(search_query)) < 2 THEN
    RETURN NULL;
  END IF;

  SELECT ps.term INTO suggestion
  FROM public.popular_searches ps
  WHERE extensions.similarity(LOWER(search_query), ps.term) > 0.3
    AND ps.term != LOWER(search_query)
  ORDER BY extensions.similarity(LOWER(search_query), ps.term) DESC, ps.search_count DESC
  LIMIT 1;

  IF suggestion IS NOT NULL THEN RETURN suggestion; END IF;

  SELECT p.name INTO suggestion
  FROM public.products p
  WHERE p.is_active = true AND p.moderation_status = 'approved'
    AND extensions.similarity(LOWER(search_query), LOWER(p.name)) > 0.25
    AND LOWER(p.name) != LOWER(search_query)
  ORDER BY extensions.similarity(LOWER(search_query), LOWER(p.name)) DESC
  LIMIT 1;

  RETURN suggestion;
END;
$$;
