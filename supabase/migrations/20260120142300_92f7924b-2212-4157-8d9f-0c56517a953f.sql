-- Add columns to seller_transactions for fee transparency
ALTER TABLE public.seller_transactions 
  ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS stripe_fee DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS net_before_commission DECIMAL(10,2);

-- Add marketplace fee settings
INSERT INTO public.settings (key, value) 
VALUES 
  ('stripe_fee_pass_through', 'true'),
  ('stripe_fee_percentage_estimate', '2.9'),
  ('stripe_fee_fixed_estimate', '0.30')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;