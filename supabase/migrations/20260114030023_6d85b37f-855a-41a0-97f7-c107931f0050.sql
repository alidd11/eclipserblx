-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage review reminders" ON public.review_reminders;

-- Create more specific policies for insert/update/delete
-- Staff can manage review reminders
CREATE POLICY "Staff can manage review reminders"
ON public.review_reminders
FOR ALL
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- Users can update their own review reminders (mark as submitted)
CREATE POLICY "Users can update their own review reminders"
ON public.review_reminders
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);