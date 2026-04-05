
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
BEGIN
  current_uid := auth.uid();

  IF search_query IS NOT NULL AND search_query != '' THEN
    BEGIN
      tsq := websearch_to_tsquery('english', search_query);
    EXCEPTION WHEN OTHERS THEN
      tsq := plainto_tsquery('english', search_query);
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
        WHEN search_query = '' OR search_query IS NULL THEN 0.5
        ELSE GREATEST(
          COALESCE(ts_rank_cd(p.search_vector, tsq, 32), 0) * 2.0,
          extensions.similarity(LOWER(p.name), LOWER(search_query)) * 0.8
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
      search_query = '' OR search_query IS NULL
      OR p.search_vector @@ tsq
      OR extensions.similarity(LOWER(p.name), LOWER(search_query)) > 0.15
      OR LOWER(p.name) ILIKE '%' || LOWER(search_query) || '%'
      OR LOWER(p.description) ILIKE '%' || LOWER(search_query) || '%'
    )
    AND (category_filter IS NULL OR c.slug = category_filter)
    AND (min_price IS NULL OR p.price >= min_price)
    AND (max_price IS NULL OR p.price <= max_price)
    AND (free_only = false OR p.price = 0)
  ORDER BY
    CASE WHEN sort_by = 'price_asc' THEN p.price END ASC NULLS LAST,
    CASE WHEN sort_by = 'price_desc' THEN p.price END DESC NULLS LAST,
    CASE WHEN sort_by = 'newest' THEN EXTRACT(EPOCH FROM p.created_at) END DESC NULLS LAST,
    CASE WHEN sort_by = 'popular' THEN COALESCE(p.download_count, 0) END DESC NULLS LAST,
    CASE WHEN sort_by = 'relevance' OR sort_by IS NULL THEN 1 ELSE 0 END DESC,
    rank_score DESC
  LIMIT page_size OFFSET page_offset;
END;
$$;
