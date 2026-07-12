DROP POLICY IF EXISTS "Customers can create conversations for purchased stores" ON public.store_conversations;

CREATE POLICY "Customers can create conversations for purchased stores"
  ON public.store_conversations
  FOR INSERT
  WITH CHECK (
    (auth.uid() = customer_id)
    AND EXISTS (
      SELECT 1
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = auth.uid()
        AND o.status IN ('paid', 'completed')
        AND p.store_id = store_conversations.store_id
    )
  );