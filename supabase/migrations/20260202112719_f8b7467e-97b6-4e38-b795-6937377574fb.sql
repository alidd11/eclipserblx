-- Drop the existing payment_method check constraint and recreate with all valid values
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

-- Add the updated constraint that includes 'credits' and 'stripe' as valid payment methods
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method IN ('card', 'paypal', 'apple_pay', 'google_pay', 'link', 'saved_card', 'credits', 'stripe'));