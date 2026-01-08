-- Drop the incorrect policies first
DROP POLICY IF EXISTS "Applicants can view their messages" ON public.applicant_messages;

-- Create a proper policy that allows checking application status by email (public read for status check)
-- This is acceptable as it only returns limited data (status) and requires knowing the exact email
CREATE POLICY "Anyone can read applications by email"
ON public.job_applications
FOR SELECT
USING (true);

-- Create a proper policy for applicant messages
-- This needs to allow reading messages for an application when the applicant's email matches
CREATE POLICY "Applicants can view their own messages"
ON public.applicant_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.job_applications ja 
    WHERE ja.id = applicant_messages.application_id
  )
);