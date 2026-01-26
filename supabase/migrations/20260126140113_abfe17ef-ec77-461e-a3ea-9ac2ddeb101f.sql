-- =====================================================
-- FIX: Remove circular RLS policies causing infinite recursion
-- =====================================================

-- 1. Drop the problematic "Product managers view product orders" policy that queries order_items
DROP POLICY IF EXISTS "Product managers view product orders" ON public.orders;

-- 2. Drop duplicate/redundant policies on orders to clean up
DROP POLICY IF EXISTS "Order and support staff can view all orders" ON public.orders;

-- 3. Drop redundant admin policies on profiles (we have duplicates)
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Order manager can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Support agent can view all profiles" ON public.profiles;

-- 4. Create a simpler, non-recursive policy for product managers on orders
-- They can view orders that contain products from stores (no circular reference)
CREATE POLICY "Product managers can view all orders"
ON public.orders
FOR SELECT
USING (public.has_role(auth.uid(), 'product_manager'));