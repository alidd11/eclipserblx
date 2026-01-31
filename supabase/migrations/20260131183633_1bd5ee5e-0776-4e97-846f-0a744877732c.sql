-- Add missing DELETE policy for staff_chat_messages
CREATE POLICY "Staff can delete own staff chat messages"
ON public.staff_chat_messages FOR DELETE
TO authenticated
USING (auth.uid() = user_id);