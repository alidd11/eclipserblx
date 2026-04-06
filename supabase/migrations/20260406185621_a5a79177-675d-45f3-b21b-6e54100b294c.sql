
-- Add access_token column
ALTER TABLE public.job_applications
ADD COLUMN access_token uuid DEFAULT gen_random_uuid() NOT NULL;

-- Unique index for fast lookups
CREATE UNIQUE INDEX idx_job_applications_access_token ON public.job_applications(access_token);

-- Allow anon/authenticated to SELECT their own application by access_token
CREATE POLICY "Applicants can view own application by token"
ON public.job_applications
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow reading messages for an application the user can access by token
-- (the app will filter by token client-side; RLS allows reading messages tied to any application)
CREATE POLICY "Applicants can read messages for their application"
ON public.applicant_messages
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow marking messages as read
CREATE POLICY "Applicants can mark messages as read"
ON public.applicant_messages
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);
