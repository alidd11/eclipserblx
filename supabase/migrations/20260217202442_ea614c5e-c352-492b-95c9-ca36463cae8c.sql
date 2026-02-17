-- Fix 1: Add SELECT policies for chat_messages so staff can read messages
CREATE POLICY "Staff can view all chat messages"
ON public.chat_messages
FOR SELECT
USING (public.is_staff(auth.uid()));

CREATE POLICY "Users can view their chat messages"
ON public.chat_messages
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM chat_conversations
  WHERE chat_conversations.id = chat_messages.conversation_id
  AND (chat_conversations.user_id = auth.uid() OR chat_conversations.user_id IS NULL)
));