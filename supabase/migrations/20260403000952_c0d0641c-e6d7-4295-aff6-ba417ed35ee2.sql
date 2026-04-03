
-- Create the weighted search ranking function
CREATE OR REPLACE FUNCTION public.search_products_ranked(
  search_query TEXT DEFAULT '',
  category_filter TEXT DEFAULT NULL,
  min_price NUMERIC DEFAULT NULL,
  max_price NUMERIC DEFAULT NULL,
  free_only BOOLEAN DEFAULT FALSE,
  page_size INT DEFAULT 20,
  page_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  price NUMERIC,
  images TEXT[],
  description TEXT,
  created_at TIMESTAMPTZ,
  total_sales INT,
  download_count INT,
  category_name TEXT,
  category_slug TEXT,
  store_name TEXT,
  store_slug TEXT,
  store_verified BOOLEAN,
  rank_score DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_sales NUMERIC;
  max_recent_sales NUMERIC;
BEGIN
  -- Get max values for normalization
  SELECT COALESCE(MAX(p.total_sales), 1) INTO max_sales FROM products p WHERE p.is_active = true;
  
  SELECT COALESCE(MAX(recent_count), 1) INTO max_recent_sales
  FROM (
    SELECT oi.product_id, COUNT(*) as recent_count
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at > NOW() - INTERVAL '24 hours'
      AND o.status IN ('completed', 'delivered')
    GROUP BY oi.product_id
  ) recent;

  RETURN QUERY
  WITH recent_sales AS (
    SELECT oi.product_id, COUNT(*)::NUMERIC as sale_count
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at > NOW() - INTERVAL '24 hours'
      AND o.status IN ('completed', 'delivered')
    GROUP BY oi.product_id
  )
  SELECT
    p.id,
    p.name,
    p.slug,
    p.price,
    p.images,
    p.description,
    p.created_at,
    p.total_sales,
    p.download_count,
    c.name AS category_name,
    c.slug AS category_slug,
    s.name AS store_name,
    s.slug AS store_slug,
    s.is_verified AS store_verified,
    (
      -- Text relevance (35%)
      CASE 
        WHEN search_query = '' THEN 0.5
        ELSE GREATEST(
          extensions.similarity(LOWER(p.name), LOWER(search_query)),
          extensions.similarity(LOWER(COALESCE(p.description, '')), LOWER(search_query)) * 0.7
        )
      END * 0.35
      -- Sales score (20%)
      + (COALESCE(p.total_sales, 0)::NUMERIC / max_sales) * 0.20
      -- Conversion score (15%) - fallback to sales-based
      + (LEAST(COALESCE(p.total_sales, 0)::NUMERIC / GREATEST(COALESCE(p.download_count, 1), 1), 1.0)) * 0.15
      -- Rating score (10%) - derived from review averages if available
      + 0.5 * 0.10
      -- Recency score (10%)
      + GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (NOW() - p.created_at)) / (90 * 86400)) * 0.10
      -- Trending score (10%)
      + (COALESCE(rs.sale_count, 0) / max_recent_sales) * 0.10
    )::DOUBLE PRECISION AS rank_score
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN stores s ON s.id = p.store_id
  LEFT JOIN recent_sales rs ON rs.product_id = p.id
  WHERE p.is_active = true
    AND p.moderation_status = 'approved'
    AND (s.is_active IS NULL OR s.is_active = true)
    AND (search_query = '' OR 
         LOWER(p.name) ILIKE '%' || LOWER(search_query) || '%' OR
         LOWER(COALESCE(p.description, '')) ILIKE '%' || LOWER(search_query) || '%' OR
         extensions.similarity(LOWER(p.name), LOWER(search_query)) > 0.1)
    AND (category_filter IS NULL OR c.slug = category_filter)
    AND (min_price IS NULL OR p.price >= min_price)
    AND (max_price IS NULL OR p.price <= max_price)
    AND (free_only = false OR p.price = 0)
  ORDER BY rank_score DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;
