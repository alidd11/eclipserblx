-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view their purchased products" ON public.products;

-- Create a security definer function to get user email safely
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = _user_id
$$;

-- Recreate policy using the security definer function
CREATE POLICY "Users can view their purchased products"
ON public.products
FOR SELECT
USING (
  id IN (
    SELECT oi.product_id 
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status IN ('paid', 'completed')
    AND (o.user_id = auth.uid() OR o.customer_email = public.get_user_email(auth.uid()))
  )
);