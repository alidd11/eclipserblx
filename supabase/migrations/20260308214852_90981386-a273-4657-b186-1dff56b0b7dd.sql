
-- 1. Fix applicant_messages: restrict to actual applicant via email
DROP POLICY IF EXISTS "Applicants can view their own messages" ON public.applicant_messages;
CREATE POLICY "Applicants can view their own messages"
  ON public.applicant_messages
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM job_applications ja 
    WHERE ja.id = applicant_messages.application_id 
    AND ja.applicant_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ));

-- 2. Fix global_guard_server_usage
DROP POLICY IF EXISTS "Service role can manage server usage" ON public.global_guard_server_usage;
CREATE POLICY "Service role can manage server usage"
  ON public.global_guard_server_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own server usage"
  ON public.global_guard_server_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Fix views with security_invoker
ALTER VIEW public.orders_seller_view SET (security_invoker = on);
ALTER VIEW public.ip_shield_stats SET (security_invoker = on);
