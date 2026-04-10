-- Add missing DELETE policy for staff on job_applications
CREATE POLICY "Staff can delete job applications"
ON public.job_applications
FOR DELETE
TO authenticated
USING (is_staff(auth.uid()));