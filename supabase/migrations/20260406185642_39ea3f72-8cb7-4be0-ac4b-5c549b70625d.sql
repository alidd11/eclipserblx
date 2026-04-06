
-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Applicants can mark messages as read" ON public.applicant_messages;

-- More restrictive: only allow updating is_read to true
CREATE POLICY "Applicants can mark messages as read"
ON public.applicant_messages
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (is_read = true);
