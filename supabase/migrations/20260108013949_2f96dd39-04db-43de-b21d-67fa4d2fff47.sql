-- Add explicit deny-all policy for password_reset_codes (backend-only table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'password_reset_codes' 
      AND policyname = 'Deny all access to password reset codes'
  ) THEN
    CREATE POLICY "Deny all access to password reset codes"
    ON public.password_reset_codes
    FOR ALL
    USING (false)
    WITH CHECK (false);
  END IF;
END $$;

-- Tighten public job application insert policy (avoid WITH CHECK (true))
DROP POLICY IF EXISTS "Anyone can submit applications" ON public.job_applications;

CREATE POLICY "Anyone can submit applications"
ON public.job_applications
FOR INSERT
WITH CHECK (
  status = 'pending'
  AND reviewed_at IS NULL
  AND reviewed_by IS NULL
  AND notes IS NULL
);
