
-- Security definer function to check if user purchased a product (breaks RLS cycle)
CREATE OR REPLACE FUNCTION public.user_has_purchased_product(_user_id uuid, _product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.product_id = _product_id
      AND o.status IN ('paid', 'completed')
      AND (o.user_id = _user_id OR o.customer_email = public.get_user_email(_user_id))
  )
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view their purchased products" ON public.products;

-- Recreate using the security definer function
CREATE POLICY "Users can view their purchased products"
ON public.products FOR SELECT
USING (public.user_has_purchased_product(auth.uid(), id));
