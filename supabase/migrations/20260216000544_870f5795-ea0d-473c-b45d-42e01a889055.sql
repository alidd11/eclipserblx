
-- Add restricted_to_user_id column to discount_codes table
ALTER TABLE public.discount_codes 
ADD COLUMN IF NOT EXISTS restricted_to_user_id UUID DEFAULT NULL;

-- Add index for lookups
CREATE INDEX IF NOT EXISTS idx_discount_codes_restricted_user 
ON public.discount_codes (restricted_to_user_id) 
WHERE restricted_to_user_id IS NOT NULL;
