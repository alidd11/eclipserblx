-- =============================================
-- RLS POLICY SECURITY & PERFORMANCE OPTIMIZATION
-- =============================================

-- 1. FIX: job_applications - Remove overly permissive SELECT policy
--    This was allowing anyone to view all applications (PII leak)
DROP POLICY IF EXISTS "Anyone can read applications by email" ON public.job_applications;

-- 2. FIX: orders - Tighten INSERT policy to require user_id match
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
CREATE POLICY "Users can create their own orders" 
ON public.orders 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  (user_id IS NULL OR user_id = auth.uid())
);

-- 3. FIX: order_items - Tighten INSERT policy to verify order ownership
DROP POLICY IF EXISTS "Authenticated users can create order items" ON public.order_items;
CREATE POLICY "Users can create items for their own orders" 
ON public.order_items 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
  )
);

-- 4. PERFORMANCE: Add index on user_roles.user_id for faster role lookups
--    (Critical for is_staff and has_role function performance)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- 5. PERFORMANCE: Add composite index for order_items policy subquery
CREATE INDEX IF NOT EXISTS idx_order_items_order_user ON public.order_items(order_id);

-- 6. PERFORMANCE: Add index for chat_messages policy subquery
CREATE INDEX IF NOT EXISTS idx_chat_conversations_id_user ON public.chat_conversations(id, user_id);

-- 7. PERFORMANCE: Add index for ticket_messages policy subquery  
CREATE INDEX IF NOT EXISTS idx_support_tickets_id_user ON public.support_tickets(id, user_id);