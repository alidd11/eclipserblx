-- Fix chat_messages INSERT policies: change from PUBLIC to authenticated
DROP POLICY IF EXISTS "Users can send messages in their chats" ON public.chat_messages;
DROP POLICY IF EXISTS "Staff can send chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Staff can view all chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view their chat messages" ON public.chat_messages;

-- Recreate with authenticated role
CREATE POLICY "Users can send messages in their chats" ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_conversations
    WHERE chat_conversations.id = chat_messages.conversation_id
    AND (chat_conversations.user_id = auth.uid() OR chat_conversations.user_id IS NULL)
  )
);

CREATE POLICY "Staff can send chat messages" ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can view all chat messages" ON public.chat_messages
FOR SELECT TO authenticated
USING (is_staff(auth.uid()));

CREATE POLICY "Users can view their chat messages" ON public.chat_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_conversations
    WHERE chat_conversations.id = chat_messages.conversation_id
    AND (chat_conversations.user_id = auth.uid() OR chat_conversations.user_id IS NULL)
  )
);

-- Fix staff_messages INSERT policy
DROP POLICY IF EXISTS "Staff can send messages" ON public.staff_messages;
DROP POLICY IF EXISTS "Staff can view their messages" ON public.staff_messages;
DROP POLICY IF EXISTS "Staff can update read status" ON public.staff_messages;

CREATE POLICY "Staff can send messages" ON public.staff_messages
FOR INSERT TO authenticated
WITH CHECK (is_staff(auth.uid()) AND sender_id = auth.uid());

CREATE POLICY "Staff can view their messages" ON public.staff_messages
FOR SELECT TO authenticated
USING (
  is_staff(auth.uid()) AND (
    recipient_id = auth.uid() OR recipient_id IS NULL OR sender_id = auth.uid()
  )
);

CREATE POLICY "Staff can update read status" ON public.staff_messages
FOR UPDATE TO authenticated
USING (
  is_staff(auth.uid()) AND (recipient_id = auth.uid() OR recipient_id IS NULL)
);