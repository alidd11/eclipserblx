-- 1. Tighten seller_payouts: replace is_staff() with has_permission manage_payouts
DROP POLICY IF EXISTS "Staff can manage seller payouts" ON public.seller_payouts;

CREATE POLICY "Staff with manage_payouts can manage seller payouts"
  ON public.seller_payouts
  FOR ALL
  TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_payouts'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_payouts'));

-- 2. Tighten affiliate_payouts: replace is_staff() with has_permission manage_payouts
DROP POLICY IF EXISTS "Staff can manage aff payouts" ON public.affiliate_payouts;

CREATE POLICY "Staff with manage_payouts can manage affiliate payouts"
  ON public.affiliate_payouts
  FOR ALL
  TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_payouts'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_payouts'));

-- 3. Fix discord_xp: hide unlinked users (user_id IS NULL) from public view
DROP POLICY IF EXISTS "Discord XP is publicly viewable with privacy" ON public.discord_xp;

CREATE POLICY "Discord XP is publicly viewable with privacy"
  ON public.discord_xp
  FOR SELECT
  TO public
  USING (
    (
      user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = discord_xp.user_id
          AND p.hide_from_leaderboard = true
      )
    )
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );