-- Drop the existing admin delete policy
DROP POLICY IF EXISTS "Admins can delete download logs" ON public.download_logs;

-- Create a more restrictive policy that only allows a specific user to delete
-- Using email check via profiles table
CREATE POLICY "Only owner can delete download logs"
ON public.download_logs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.email = 'alicanimir1@gmail.com'
  )
);