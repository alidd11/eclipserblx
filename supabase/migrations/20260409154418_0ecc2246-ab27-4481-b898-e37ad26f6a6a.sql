
-- 1. Fix the 2 security-definer views
ALTER VIEW public.discord_trivia_questions_safe SET (security_invoker = on);
ALTER VIEW public.staff_performance_summary SET (security_invoker = on);

-- 2. Tighten the 3 overly permissive INSERT policies
DROP POLICY IF EXISTS "Service role can insert bot error logs" ON public.bot_error_logs;
CREATE POLICY "Staff can insert bot error logs"
  ON public.bot_error_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Service role can insert leak scan results" ON public.leak_scan_results;
CREATE POLICY "Staff can insert leak scan results"
  ON public.leak_scan_results FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Service role can insert webhook delivery logs" ON public.webhook_delivery_logs;
CREATE POLICY "Staff can insert webhook delivery logs"
  ON public.webhook_delivery_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
