-- Drop the policy we just created that's too restrictive
DROP POLICY IF EXISTS "Users can view their purchased products" ON public.products;

-- Recreate a combined policy: users can view active products OR products they purchased
CREATE POLICY "Users can view their purchased products"
ON public.products
FOR SELECT
USING (
  -- Products they purchased (even if inactive)
  id IN (
    SELECT oi.product_id 
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status IN ('paid', 'completed')
    AND (o.user_id = auth.uid() OR o.customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
);