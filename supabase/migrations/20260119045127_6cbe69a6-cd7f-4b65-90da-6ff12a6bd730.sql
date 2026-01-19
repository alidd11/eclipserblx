-- Drop the overly permissive policies
DROP POLICY IF EXISTS "System can insert commissions" ON public.affiliate_commissions;
DROP POLICY IF EXISTS "System can manage balances" ON public.affiliate_balances;

-- The triggers run with SECURITY DEFINER which bypasses RLS, so we don't need these policies
-- Staff should be able to insert commissions if needed
CREATE POLICY "Staff can insert commissions"
  ON public.affiliate_commissions FOR INSERT
  WITH CHECK (public.is_staff(auth.uid()));

-- Staff should be able to manage balances if needed
CREATE POLICY "Staff can manage balances"
  ON public.affiliate_balances FOR INSERT
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update balances"
  ON public.affiliate_balances FOR UPDATE
  USING (public.is_staff(auth.uid()));