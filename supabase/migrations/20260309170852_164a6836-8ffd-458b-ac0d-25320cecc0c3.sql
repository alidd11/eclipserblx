
-- Backfill seller_transactions for Quantis store (admin-managed, 0% commission)
-- Only insert transactions that don't already exist (idempotent)
INSERT INTO public.seller_transactions (
  seller_id, store_id, order_id, order_item_id, type, amount, gross_amount, 
  platform_fee, stripe_fee, net_amount, net_before_commission, status, description, created_at,
  escrow_hold_until, escrow_released_at
)
SELECT 
  '9b70ccd6-da02-4d53-8180-e884e1d18b3f' as seller_id,
  '83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a' as store_id,
  o.id as order_id,
  oi.id as order_item_id,
  'sale' as type,
  oi.price as amount,
  oi.price as gross_amount,
  0 as platform_fee,
  0 as stripe_fee,
  oi.price as net_amount,
  oi.price as net_before_commission,
  'completed' as status,
  'Sale of ' || p.name as description,
  o.created_at,
  o.created_at as escrow_hold_until,
  o.created_at as escrow_released_at
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE p.store_id = '83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a'
  AND o.status IN ('paid', 'completed')
  AND NOT EXISTS (
    SELECT 1 FROM seller_transactions st 
    WHERE st.order_item_id = oi.id AND st.store_id = '83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a'
  );

-- Sync seller_balances for Quantis store
UPDATE public.seller_balances
SET 
  total_earned = (
    SELECT COALESCE(SUM(net_amount), 0) 
    FROM seller_transactions 
    WHERE store_id = '83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a' 
      AND type = 'sale' AND refunded_at IS NULL
  ),
  available_balance = (
    SELECT COALESCE(SUM(net_amount), 0) 
    FROM seller_transactions 
    WHERE store_id = '83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a' 
      AND type = 'sale' AND refunded_at IS NULL
  ),
  updated_at = now()
WHERE store_id = '83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a';

-- Sync stores.total_sales and total_revenue
UPDATE public.stores
SET 
  total_sales = (
    SELECT COUNT(DISTINCT o.id) 
    FROM orders o 
    JOIN order_items oi ON oi.order_id = o.id 
    JOIN products p ON p.id = oi.product_id 
    WHERE p.store_id = '83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a' 
      AND o.status IN ('paid', 'completed')
  ),
  total_revenue = (
    SELECT COALESCE(SUM(oi.price), 0) 
    FROM order_items oi 
    JOIN orders o ON o.id = oi.order_id 
    JOIN products p ON p.id = oi.product_id 
    WHERE p.store_id = '83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a' 
      AND o.status IN ('paid', 'completed')
  )
WHERE id = '83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a';
