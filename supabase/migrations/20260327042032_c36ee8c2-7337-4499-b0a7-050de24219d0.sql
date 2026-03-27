
-- Auto-enroll every new user as an affiliate on signup
-- Trigger on profiles table (created after auth.users signup)

CREATE OR REPLACE FUNCTION public.auto_enroll_affiliate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create approved affiliate application
  INSERT INTO public.affiliate_applications (
    user_id,
    email,
    display_name,
    promotion_method,
    status,
    reviewed_at
  ) VALUES (
    NEW.user_id,
    COALESCE(NEW.email, ''),
    NEW.display_name,
    'Auto-enrolled',
    'approved',
    now()
  )
  ON CONFLICT DO NOTHING;

  -- Create affiliate balance record
  INSERT INTO public.affiliate_balances (
    user_id,
    total_earned,
    available_balance,
    total_paid,
    total_clicks,
    total_signups
  ) VALUES (
    NEW.user_id,
    0, 0, 0, 0, 0
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger after profile insert
DROP TRIGGER IF EXISTS trigger_auto_enroll_affiliate ON public.profiles;
CREATE TRIGGER trigger_auto_enroll_affiliate
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_enroll_affiliate();

-- Backfill: enroll all existing users who don't have an affiliate application
INSERT INTO public.affiliate_applications (user_id, email, display_name, promotion_method, status, reviewed_at)
SELECT p.user_id, COALESCE(p.email, ''), p.display_name, 'Auto-enrolled', 'approved', now()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.affiliate_applications aa WHERE aa.user_id = p.user_id
);

-- Backfill: create affiliate balances for existing users who don't have one
INSERT INTO public.affiliate_balances (user_id, total_earned, available_balance, total_paid, total_clicks, total_signups)
SELECT p.user_id, 0, 0, 0, 0, 0
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.affiliate_balances ab WHERE ab.user_id = p.user_id
);

-- Add bank transfer fields to affiliate_applications for parity with seller payout options
ALTER TABLE public.affiliate_applications 
  ADD COLUMN IF NOT EXISTS bank_account_holder TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_swift_bic TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_country TEXT,
  ADD COLUMN IF NOT EXISTS bank_routing_number TEXT;
