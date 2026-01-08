-- Add foreign key relationships for referrals table
ALTER TABLE public.referrals 
ADD CONSTRAINT referrals_referrer_id_fkey 
FOREIGN KEY (referrer_id) REFERENCES public.profiles(user_id);

ALTER TABLE public.referrals 
ADD CONSTRAINT referrals_referred_id_fkey 
FOREIGN KEY (referred_id) REFERENCES public.profiles(user_id);

-- Add foreign key for referral_rewards
ALTER TABLE public.referral_rewards 
ADD CONSTRAINT referral_rewards_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);