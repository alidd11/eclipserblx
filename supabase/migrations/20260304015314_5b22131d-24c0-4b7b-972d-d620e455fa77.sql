-- Drop the overly permissive policy
DROP POLICY "Applicants can view own applications by email" ON public.job_applications;