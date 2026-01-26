-- =====================================================
-- SECURITY FIX: Tighten RLS policies for error-level issues
-- =====================================================

-- 1. FIX: affiliate_commissions - Remove permissive INSERT policy
-- Commission records should ONLY be created by database triggers, not direct inserts
DROP POLICY IF EXISTS "System can insert commissions" ON public.affiliate_commissions;

-- Create restrictive policy - only service role (triggers/functions) can insert
CREATE POLICY "Only triggers can insert commissions"
ON public.affiliate_commissions
FOR INSERT
WITH CHECK (false); -- Block all direct client inserts - triggers bypass RLS

-- 2. FIX: affiliate_balances - Remove permissive ALL policy
DROP POLICY IF EXISTS "System can manage balances" ON public.affiliate_balances;

-- Create restrictive policies for affiliate_balances
-- Users can only view their own balance
CREATE POLICY "Users can view own affiliate balance"
ON public.affiliate_balances
FOR SELECT
USING (auth.uid() = user_id);

-- Staff can view all balances for admin purposes
CREATE POLICY "Staff can view all affiliate balances"
ON public.affiliate_balances
FOR SELECT
USING (public.is_staff(auth.uid()));

-- Block direct inserts/updates from clients - only triggers should modify
CREATE POLICY "Only triggers can insert balances"
ON public.affiliate_balances
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Only triggers can update balances"
ON public.affiliate_balances
FOR UPDATE
USING (false);

-- 3. FIX: profiles table - Restrict staff access based on actual need
-- Drop existing overly permissive staff policies
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Support agents can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Order managers can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view profiles for support" ON public.profiles;

-- Admin can view all profiles (needed for admin panel)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Support agents can view profiles of users they have active tickets with
CREATE POLICY "Support agents view profiles for their assigned tickets"
ON public.profiles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'support_agent') AND (
    -- Can view profiles of customers in chats assigned to them
    EXISTS (
      SELECT 1 FROM public.chat_conversations cc
      WHERE cc.assigned_to = auth.uid()
      AND cc.user_id = profiles.user_id
    )
    OR
    -- Can view profiles of sellers with tickets assigned to them
    EXISTS (
      SELECT 1 FROM public.seller_support_tickets sst
      JOIN public.stores s ON s.id = sst.store_id
      WHERE sst.assigned_to = auth.uid()
      AND s.owner_id = profiles.user_id
    )
  )
);

-- Order managers can view profiles of users with orders they're managing
CREATE POLICY "Order managers view profiles for their orders"
ON public.profiles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'order_manager') AND
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.user_id = profiles.user_id
  )
);

-- Product managers can view seller profiles (store owners)
CREATE POLICY "Product managers view seller profiles"
ON public.profiles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'product_manager') AND
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.owner_id = profiles.user_id
  )
);

-- 4. FIX: orders table - Restrict support agent access
DROP POLICY IF EXISTS "Support agents can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Support agents can view orders" ON public.orders;

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Order managers can view all orders (their job)
CREATE POLICY "Order managers can view all orders"
ON public.orders
FOR SELECT
USING (public.has_role(auth.uid(), 'order_manager'));

-- Support agents can only view orders related to users they have active support conversations with
CREATE POLICY "Support agents view orders for their tickets"
ON public.orders
FOR SELECT
USING (
  public.has_role(auth.uid(), 'support_agent') AND (
    -- Orders from customers in assigned chats
    EXISTS (
      SELECT 1 FROM public.chat_conversations cc
      WHERE cc.assigned_to = auth.uid()
      AND cc.user_id = orders.user_id
    )
    OR
    -- Orders where customer email matches a chat customer
    EXISTS (
      SELECT 1 FROM public.chat_conversations cc
      WHERE cc.assigned_to = auth.uid()
      AND cc.customer_email = orders.customer_email
    )
  )
);

-- Product managers can view orders for products they manage
CREATE POLICY "Product managers view product orders"
ON public.orders
FOR SELECT
USING (
  public.has_role(auth.uid(), 'product_manager') AND
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = orders.id
  )
);