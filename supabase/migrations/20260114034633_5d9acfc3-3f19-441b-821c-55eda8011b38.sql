-- Fix 1: profiles_table_public_exposure
-- Remove overly permissive staff policy and keep only roles that need profile access
DROP POLICY IF EXISTS "Staff can view limited profile info" ON public.profiles;

-- Fix 2: orders_customer_email_exposure  
-- Replace "Staff can view all orders" with more restrictive policy
DROP POLICY IF EXISTS "Staff can view all orders" ON public.orders;

CREATE POLICY "Order and support staff can view all orders"
ON public.orders
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'order_manager'::app_role) OR 
  has_role(auth.uid(), 'support_agent'::app_role)
);

-- Fix 3: chat_messages access - currently allows staff to view, restrict to admin and support_agent
-- First check existing policy and update
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.chat_messages;

CREATE POLICY "Users can view messages in their chats"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM chat_conversations
    WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'support_agent'::app_role)
);

-- Fix 4: support_tickets_customer_email
-- Need to check if there's a policy for staff viewing tickets and restrict it
-- Based on the finding, there's a "Staff can view all tickets" policy
DROP POLICY IF EXISTS "Staff can view all tickets" ON public.support_tickets;

CREATE POLICY "Support and admin staff can view all tickets"
ON public.support_tickets
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'support_agent'::app_role)
);