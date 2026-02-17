
-- Add INSERT policy for staff
CREATE POLICY "Staff can insert QOTDs"
ON public.discord_qotd
FOR INSERT
WITH CHECK (public.is_staff(auth.uid()));

-- Add UPDATE policy for staff
CREATE POLICY "Staff can update QOTDs"
ON public.discord_qotd
FOR UPDATE
USING (public.is_staff(auth.uid()));

-- Add DELETE policy for staff
CREATE POLICY "Staff can delete QOTDs"
ON public.discord_qotd
FOR DELETE
USING (public.is_staff(auth.uid()));
