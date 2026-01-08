-- Create referrals table to track referral relationships
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  order_id UUID REFERENCES public.orders(id)
);

-- Create referral_rewards table to track rewards
CREATE TABLE public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  referral_id UUID REFERENCES public.referrals(id),
  reward_type TEXT NOT NULL DEFAULT 'percentage_discount',
  reward_value NUMERIC NOT NULL DEFAULT 10,
  discount_code_id UUID REFERENCES public.discount_codes(id),
  is_used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add referral_code to profiles for unique user referral codes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referral_code ON public.referrals(referral_code);
CREATE INDEX idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX idx_referral_rewards_user_id ON public.referral_rewards(user_id);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals
CREATE POLICY "Users can view their own referrals"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can create referrals as referrer"
ON public.referrals FOR INSERT
WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Staff can view all referrals"
ON public.referrals FOR SELECT
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can manage referrals"
ON public.referrals FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for referral_rewards
CREATE POLICY "Users can view their own rewards"
ON public.referral_rewards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all rewards"
ON public.referral_rewards FOR SELECT
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can manage rewards"
ON public.referral_rewards FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to generate unique referral code for user
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Trigger to auto-generate referral code for new profiles
CREATE OR REPLACE FUNCTION public.set_profile_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_profile_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profile_referral_code();

-- Update existing profiles with referral codes
UPDATE public.profiles SET referral_code = generate_referral_code() WHERE referral_code IS NULL;