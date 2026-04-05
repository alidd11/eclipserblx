
DROP FUNCTION IF EXISTS public.search_products_v2(text,text,numeric,numeric,boolean,text,integer,integer);

CREATE OR REPLACE FUNCTION public.search_products_v2(
  search_query TEXT DEFAULT '',
  category_filter TEXT DEFAULT NULL,
  min_price NUMERIC DEFAULT NULL,
  max_price NUMERIC DEFAULT NULL,
  free_only BOOLEAN DEFAULT FALSE,
  sort_by TEXT DEFAULT 'relevance',
  page_size INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  price NUMERIC,
  images TEXT[],
  description TEXT,
  created_at TIMESTAMPTZ,
  product_number INTEGER,
  download_count INTEGER,
  category_name TEXT,
  category_slug TEXT,
  store_name TEXT,
  store_slug TEXT,
  store_verified BOOLEAN,
  rank_score DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tsq tsquery;
  max_downloads NUMERIC;
  current_uid UUID;
  p_min_price NUMERIC := min_price;
  p_max_price NUMERIC := max_price;
  p_search TEXT := search_query;
  p_category TEXT := category_filter;
  p_free BOOLEAN := free_only;
  p_sort TEXT := sort_by;
  p_size INTEGER := page_size;
  p_offset INTEGER := page_offset;
BEGIN
  current_uid := auth.uid();

  IF p_search IS NOT NULL AND p_search != '' THEN
    BEGIN
      tsq := websearch_to_tsquery('english', p_search);
    EXCEPTION WHEN OTHERS THEN
      tsq := plainto_tsquery('english', p_search);
    END;
  END IF;

  SELECT COALESCE(MAX(p.download_count), 1) INTO max_downloads FROM products p WHERE p.is_active = true;

  RETURN QUERY
  SELECT
    p.id, p.name, p.slug, p.price, p.images, p.description, p.created_at,
    p.product_number,
    p.download_count,
    c.name AS category_name, c.slug AS category_slug,
    s.name AS store_name, s.slug AS store_slug, s.is_verified AS store_verified,
    (
      CASE
        WHEN p_search = '' OR p_search IS NULL THEN 0.5
        ELSE GREATEST(
          COALESCE(ts_rank_cd(p.search_vector, tsq, 32), 0) * 2.0,
          extensions.similarity(LOWER(p.name), LOWER(p_search)) * 0.8
        )
      END * 0.35
      + (COALESCE(p.download_count, 0)::NUMERIC / max_downloads) * 0.20
      + 0.15
      + GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (NOW() - p.created_at)) / (90 * 86400)) * 0.15
      + (
        CASE WHEN s.is_verified = true THEN 0.6 ELSE 0.3 END
        + LEAST(COALESCE(p.download_count, 0)::NUMERIC / 50.0, 0.4)
      ) * 0.10
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
      p_search = '' OR p_search IS NULL
      OR p.search_vector @@ tsq
      OR extensions.similarity(LOWER(p.name), LOWER(p_search)) > 0.15
      OR LOWER(p.name) ILIKE '%' || LOWER(p_search) || '%'
      OR LOWER(p.description) ILIKE '%' || LOWER(p_search) || '%'
    )
    AND (p_category IS NULL OR c.slug = p_category)
    AND (p_min_price IS NULL OR p.price >= p_min_price)
    AND (p_max_price IS NULL OR p.price <= p_max_price)
    AND (p_free = false OR p.price = 0)
  ORDER BY
    CASE WHEN p_sort = 'price_asc' THEN p.price END ASC NULLS LAST,
    CASE WHEN p_sort = 'price_desc' THEN p.price END DESC NULLS LAST,
    CASE WHEN p_sort = 'newest' THEN EXTRACT(EPOCH FROM p.created_at) END DESC NULLS LAST,
    CASE WHEN p_sort = 'popular' THEN COALESCE(p.download_count, 0) END DESC NULLS LAST,
    CASE WHEN p_sort = 'relevance' OR p_sort IS NULL THEN 1 ELSE 0 END DESC,
    rank_score DESC
  LIMIT p_size OFFSET p_offset;
END;
$$;
