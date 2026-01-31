-- Recreate RLS policies for admin_chat_messages
CREATE POLICY "Staff can view admin chat messages"
ON public.admin_chat_messages FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert admin chat messages"
ON public.admin_chat_messages FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()) AND auth.uid() = user_id);

CREATE POLICY "Staff can delete own admin chat messages"
ON public.admin_chat_messages FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Also fix admin_chat_reactions if needed
CREATE POLICY "Staff can view admin chat reactions"
ON public.admin_chat_reactions FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert admin chat reactions"
ON public.admin_chat_reactions FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()) AND auth.uid() = user_id);

CREATE POLICY "Staff can delete own reactions"
ON public.admin_chat_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);