-- Allow staff to view all subscriptions for admin purposes
CREATE POLICY "Staff can view all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.custom_roles cr ON cr.name = ur.role
    WHERE ur.user_id = auth.uid()
    AND cr.name NOT IN ('eclipse_plus_member', 'seller', 'customer')
  )
);