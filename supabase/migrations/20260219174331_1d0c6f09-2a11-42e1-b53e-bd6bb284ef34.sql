-- Add missing UPDATE policy for staff on chat_conversations
CREATE POLICY "Staff can update chats"
ON public.chat_conversations
FOR UPDATE
TO authenticated
USING (is_staff(auth.uid()))
WITH CHECK (is_staff(auth.uid()));