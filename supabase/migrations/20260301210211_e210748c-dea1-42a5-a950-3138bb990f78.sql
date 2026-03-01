
-- Tighten ip_violation_reports to require authentication
DROP POLICY IF EXISTS "Anyone can create IP reports" ON public.ip_violation_reports;
CREATE POLICY "Authenticated users can create IP reports"
ON public.ip_violation_reports
FOR INSERT
TO authenticated
WITH CHECK (true);
