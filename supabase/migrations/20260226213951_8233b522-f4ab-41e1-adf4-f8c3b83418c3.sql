
-- Add Pay What You Want support to products
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS is_pay_what_you_want boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_price numeric DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.products.is_pay_what_you_want IS 'When true, buyers can choose their own price (min_price to any amount). The existing price column acts as the suggested price.';
COMMENT ON COLUMN public.products.min_price IS 'Minimum price for PWYW products. Set to 0 for truly free products. For paid PWYW, minimum is £1 (Stripe minimum).';
