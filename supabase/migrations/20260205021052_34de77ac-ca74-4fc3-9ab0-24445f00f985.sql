-- Drop existing INSERT policy for developer submissions
DROP POLICY IF EXISTS "Staff can insert own submissions" ON public.developer_product_submissions;

-- Create new policy requiring 'developer' role specifically
CREATE POLICY "Developers can insert own submissions"
ON public.developer_product_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = developer_id 
  AND public.has_role(auth.uid(), 'developer')
);