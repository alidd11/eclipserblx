
-- Add policy for staff to view all profiles (needed for admin dashboard)
CREATE POLICY "Staff can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));
