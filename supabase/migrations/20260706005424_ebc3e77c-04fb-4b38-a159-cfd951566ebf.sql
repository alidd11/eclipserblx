
-- 1) Badges: remove self-award capability. Awards must go through SECURITY DEFINER function / service_role.
DROP POLICY IF EXISTS "System can award badges" ON public.user_badges;

-- 2) Referral rewards: tighten UPDATE policy with WITH CHECK preventing tampering
DROP POLICY IF EXISTS "Users can update their own rewards usage" ON public.referral_rewards;
CREATE POLICY "Users can mark their own rewards as used"
ON public.referral_rewards
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND is_used = true
);

-- 3) Stores: revoke SELECT on sensitive financial columns from anon
REVOKE SELECT (commission_rate, custom_commission_rate, custom_rate_expires_at, custom_rate_set_by, custom_rate_set_at, total_revenue)
  ON public.stores FROM anon;
