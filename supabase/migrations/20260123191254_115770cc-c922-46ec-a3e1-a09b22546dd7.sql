-- Allow users to update their own affiliate application (for payout settings)
CREATE POLICY "Users can update own application"
ON public.affiliate_applications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);