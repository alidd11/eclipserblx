-- Create table to track referral link clicks
CREATE TABLE public.referral_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code TEXT NOT NULL,
  referrer_id UUID NOT NULL,
  visitor_ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_referral_clicks_referrer ON public.referral_clicks(referrer_id);
CREATE INDEX idx_referral_clicks_code ON public.referral_clicks(referral_code);
CREATE INDEX idx_referral_clicks_created ON public.referral_clicks(created_at);

-- Enable RLS
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

-- Policy: Allow inserts from anyone (for tracking)
CREATE POLICY "Anyone can record referral clicks"
ON public.referral_clicks
FOR INSERT
WITH CHECK (true);

-- Policy: Affiliates can view their own click data
CREATE POLICY "Affiliates can view their own clicks"
ON public.referral_clicks
FOR SELECT
USING (referrer_id = auth.uid());

-- Policy: Staff can view all clicks
CREATE POLICY "Staff can view all referral clicks"
ON public.referral_clicks
FOR SELECT
USING (public.is_staff(auth.uid()));

-- Add click and signup count columns to affiliate_balances for quick access
ALTER TABLE public.affiliate_balances
ADD COLUMN IF NOT EXISTS total_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_signups INTEGER DEFAULT 0;

-- Create function to increment click count
CREATE OR REPLACE FUNCTION public.increment_referral_clicks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update or create affiliate balance with incremented click count
  INSERT INTO public.affiliate_balances (user_id, total_clicks, total_earned, available_balance, total_paid)
  VALUES (NEW.referrer_id, 1, 0, 0, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    total_clicks = COALESCE(affiliate_balances.total_clicks, 0) + 1,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-increment clicks
CREATE TRIGGER trigger_increment_referral_clicks
AFTER INSERT ON public.referral_clicks
FOR EACH ROW
EXECUTE FUNCTION public.increment_referral_clicks();

-- Create function to increment signup count when referral is created
CREATE OR REPLACE FUNCTION public.increment_referral_signups()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update affiliate balance with incremented signup count
  INSERT INTO public.affiliate_balances (user_id, total_signups, total_earned, available_balance, total_paid)
  VALUES (NEW.referrer_id, 1, 0, 0, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    total_signups = COALESCE(affiliate_balances.total_signups, 0) + 1,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-increment signups on referral creation
CREATE TRIGGER trigger_increment_referral_signups
AFTER INSERT ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.increment_referral_signups();