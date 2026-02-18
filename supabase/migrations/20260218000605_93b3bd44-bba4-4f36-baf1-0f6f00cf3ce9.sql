
-- Allow sellers to view orders that contain their products
CREATE POLICY "Sellers can view orders containing their products"
ON public.orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN stores s ON s.id = p.store_id
    WHERE oi.order_id = orders.id
      AND s.owner_id = auth.uid()
  )
);

-- Allow sellers to view order items for their store's products
CREATE POLICY "Sellers can view order items for their products"
ON public.order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM products p
    JOIN stores s ON s.id = p.store_id
    WHERE p.id = order_items.product_id
      AND s.owner_id = auth.uid()
  )
);
