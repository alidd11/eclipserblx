-- Drop the restrictive customer SELECT policy
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.chat_messages;

-- Create a new policy that allows viewing messages if:
-- 1. User owns the conversation (customer side), OR
-- 2. User is staff (agent side)
CREATE POLICY "Users can view messages in their chats" ON public.chat_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations 
    WHERE chat_conversations.id = chat_messages.conversation_id 
    AND chat_conversations.user_id = auth.uid()
  )
  OR public.is_staff(auth.uid())
);

-- Drop the separate staff SELECT policy since it's now combined
DROP POLICY IF EXISTS "Staff can view all chat messages" ON public.chat_messages;