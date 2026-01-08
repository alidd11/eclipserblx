-- Allow inserting referrals when referred_id matches the authenticated user
-- (for when a referred user registers)
CREATE POLICY "Users can link themselves as referred"
ON public.referrals FOR INSERT
WITH CHECK (auth.uid() = referred_id);

-- Allow updating referral rewards is_used flag when the user owns the reward
CREATE POLICY "Users can update their own rewards usage"
ON public.referral_rewards FOR UPDATE
USING (auth.uid() = user_id);