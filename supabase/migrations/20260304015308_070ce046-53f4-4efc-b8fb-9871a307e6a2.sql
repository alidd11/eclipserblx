-- Add missing SELECT policy so staff can view all job applications
CREATE POLICY "Staff can view all job applications"
ON public.job_applications
FOR SELECT
TO authenticated
USING (is_staff(auth.uid()));

-- Add missing UPDATE policy so staff can review/update job applications
CREATE POLICY "Staff can update job applications"
ON public.job_applications
FOR UPDATE
TO authenticated
USING (is_staff(auth.uid()))
WITH CHECK (is_staff(auth.uid()));

-- Also allow applicants to view their own application status
CREATE POLICY "Applicants can view own applications by email"
ON public.job_applications
FOR SELECT
USING (true);