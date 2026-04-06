
-- 1) Create dedicated table for financial PII
CREATE TABLE public.user_payment_details (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_payout_method TEXT DEFAULT 'stripe',
  paypal_email TEXT,
  stripe_account_id TEXT,
  bank_account_holder TEXT,
  bank_account_number TEXT,
  bank_swift_bic TEXT,
  bank_name TEXT,
  bank_country TEXT,
  bank_routing_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Migrate existing data from profiles
INSERT INTO public.user_payment_details (
  user_id, preferred_payout_method, paypal_email, stripe_account_id,
  bank_account_holder, bank_account_number, bank_swift_bic,
  bank_name, bank_country, bank_routing_number
)
SELECT
  user_id, preferred_payout_method, paypal_email, stripe_account_id,
  bank_account_holder, bank_account_number, bank_swift_bic,
  bank_name, bank_country, bank_routing_number
FROM public.profiles
WHERE preferred_payout_method IS NOT NULL
   OR paypal_email IS NOT NULL
   OR stripe_account_id IS NOT NULL
   OR bank_account_holder IS NOT NULL
   OR bank_account_number IS NOT NULL;

-- 3) Drop financial columns from profiles
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS preferred_payout_method,
  DROP COLUMN IF EXISTS paypal_email,
  DROP COLUMN IF EXISTS stripe_account_id,
  DROP COLUMN IF EXISTS bank_account_holder,
  DROP COLUMN IF EXISTS bank_account_number,
  DROP COLUMN IF EXISTS bank_swift_bic,
  DROP COLUMN IF EXISTS bank_name,
  DROP COLUMN IF EXISTS bank_country,
  DROP COLUMN IF EXISTS bank_routing_number;

-- 4) Enable RLS
ALTER TABLE public.user_payment_details ENABLE ROW LEVEL SECURITY;

-- Users can read their own payment details
CREATE POLICY "Users can view own payment details"
  ON public.user_payment_details FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own payment details
CREATE POLICY "Users can insert own payment details"
  ON public.user_payment_details FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own payment details
CREATE POLICY "Users can update own payment details"
  ON public.user_payment_details FOR UPDATE
  USING (auth.uid() = user_id);

-- Staff with manage_payouts can view all (for payout processing)
CREATE POLICY "Staff with manage_payouts can view all"
  ON public.user_payment_details FOR SELECT
  TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_payouts'));

-- 5) Timestamp trigger
CREATE TRIGGER update_user_payment_details_updated_at
  BEFORE UPDATE ON public.user_payment_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
