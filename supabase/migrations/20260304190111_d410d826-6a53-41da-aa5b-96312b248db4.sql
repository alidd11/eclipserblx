-- Fix chat_conversations policies to use authenticated
DROP POLICY IF EXISTS "Users can create chats" ON public.chat_conversations;
DROP POLICY IF EXISTS "Staff can view all chats" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can view their own chats" ON public.chat_conversations;

CREATE POLICY "Users can create chats" ON public.chat_conversations
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anon users can create chats" ON public.chat_conversations
FOR INSERT TO anon
WITH CHECK (user_id IS NULL);

CREATE POLICY "Staff can view all chats" ON public.chat_conversations
FOR SELECT TO authenticated
USING (is_staff(auth.uid()));

CREATE POLICY "Users can view their own chats" ON public.chat_conversations
FOR SELECT TO authenticated
USING (auth.uid() = user_id);