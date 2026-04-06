-- Step 1: Add payout columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_payout_method text DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS bank_account_holder text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_swift_bic text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_country text,
  ADD COLUMN IF NOT EXISTS bank_routing_number text;

-- Step 2: Migrate existing data from affiliate_applications to profiles
UPDATE public.profiles p
SET
  preferred_payout_method = COALESCE(aa.preferred_payout_method, 'stripe'),
  paypal_email = COALESCE(p.paypal_email, aa.paypal_email),
  bank_account_holder = aa.bank_account_holder,
  bank_account_number = aa.bank_account_number,
  bank_swift_bic = aa.bank_swift_bic,
  bank_name = aa.bank_name,
  bank_country = aa.bank_country,
  bank_routing_number = aa.bank_routing_number
FROM public.affiliate_applications aa
WHERE aa.user_id = p.user_id
  AND aa.status = 'approved';

-- Step 3: Update auto_enroll_affiliate trigger to not use affiliate_applications
CREATE OR REPLACE FUNCTION public.auto_enroll_affiliate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Create affiliate balance record (auto-enroll on profile creation)
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
$function$;

-- Step 4: Drop the masked view first (depends on the table)
DROP VIEW IF EXISTS public.affiliate_applications_masked;

-- Step 5: Drop triggers on affiliate_applications
DROP TRIGGER IF EXISTS set_affiliate_application_id_trigger ON public.affiliate_applications;

-- Step 6: Drop the table
DROP TABLE IF EXISTS public.affiliate_applications CASCADE;

-- Step 7: Drop orphaned functions
DROP FUNCTION IF EXISTS public.generate_affiliate_id();
DROP FUNCTION IF EXISTS public.set_affiliate_application_id();