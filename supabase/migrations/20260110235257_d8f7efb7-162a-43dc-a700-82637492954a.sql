-- Fix: Tighten rate_limits INSERT policy with validation
DROP POLICY IF EXISTS "Anyone can insert rate limits" ON public.rate_limits;

CREATE POLICY "Anyone can insert rate limits with validation" 
ON public.rate_limits 
FOR INSERT 
TO public
WITH CHECK (
  -- Validate required fields are not empty
  identifier IS NOT NULL AND identifier <> '' AND
  action_type IS NOT NULL AND action_type <> '' AND
  -- Only allow known action types
  action_type IN ('contact_form', 'job_application')
);