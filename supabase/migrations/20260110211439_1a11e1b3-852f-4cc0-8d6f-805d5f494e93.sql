-- Allow users to view products they have purchased (even if inactive)
CREATE POLICY "Users can view their purchased products"
ON public.products
FOR SELECT
USING (
  id IN (
    SELECT oi.product_id 
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status IN ('paid', 'completed')
    AND (o.user_id = auth.uid() OR o.customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
);