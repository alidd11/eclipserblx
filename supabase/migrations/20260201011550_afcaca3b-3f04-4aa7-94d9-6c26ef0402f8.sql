-- Create store_tabs for Eclipse Store based on existing categories
-- This allows Eclipse Store to use the same tab system as other sellers

INSERT INTO store_tabs (store_id, name, slug, icon, display_order, is_active)
SELECT 
  '83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a' as store_id,
  c.name,
  c.slug,
  c.icon,
  c.display_order,
  true as is_active
FROM categories c
WHERE c.id IN (
  SELECT DISTINCT category_id 
  FROM products 
  WHERE store_id = '83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a'
    AND category_id IS NOT NULL
)
ON CONFLICT DO NOTHING;

-- Link existing Eclipse Store products to their store_tabs
-- We need to do this in a way that handles the relationship correctly
INSERT INTO store_tab_products (tab_id, product_id)
SELECT 
  st.id as tab_id,
  p.id as product_id
FROM products p
JOIN categories c ON p.category_id = c.id
JOIN store_tabs st ON st.store_id = p.store_id AND st.slug = c.slug
WHERE p.store_id = '83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a'
  AND p.category_id IS NOT NULL
ON CONFLICT DO NOTHING;