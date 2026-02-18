
-- 1. Security definer: check if user owns the order
CREATE OR REPLACE FUNCTION public.user_owns_order(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = _order_id AND user_id = _user_id
  )
$$;

-- 2. Security definer: check if seller has products in an order
CREATE OR REPLACE FUNCTION public.seller_has_products_in_order(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    JOIN public.stores s ON s.id = p.store_id
    WHERE oi.order_id = _order_id AND s.owner_id = _user_id
  )
$$;

-- 3. Security definer: check if seller owns the product in an order item
CREATE OR REPLACE FUNCTION public.seller_owns_order_item_product(_user_id uuid, _product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = _product_id AND s.owner_id = _user_id
  )
$$;

-- 4. Security definer: check if user can insert order item (owns the order)
CREATE OR REPLACE FUNCTION public.user_can_insert_order_item(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = _order_id AND (user_id = _user_id OR user_id IS NULL)
  )
$$;

-- ===== Fix order_items policies =====

-- Drop all SELECT/INSERT policies on order_items that cause recursion
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Sellers can view order items for their products" ON public.order_items;
DROP POLICY IF EXISTS "Users can create items for their own orders" ON public.order_items;

-- Recreate without cross-table RLS dependency
CREATE POLICY "Users can view their own order items"
ON public.order_items FOR SELECT
USING (public.user_owns_order(auth.uid(), order_id));

CREATE POLICY "Sellers can view order items for their products"
ON public.order_items FOR SELECT
USING (public.seller_owns_order_item_product(auth.uid(), product_id));

CREATE POLICY "Users can create items for their own orders"
ON public.order_items FOR INSERT
WITH CHECK (public.user_can_insert_order_item(auth.uid(), order_id));

-- ===== Fix orders policies =====

DROP POLICY IF EXISTS "Sellers can view orders containing their products" ON public.orders;

CREATE POLICY "Sellers can view orders containing their products"
ON public.orders FOR SELECT
USING (public.seller_has_products_in_order(auth.uid(), id));
