
-- Drop recruiter tables (order matters for foreign keys)
DROP TABLE IF EXISTS public.recruiter_commissions CASCADE;
DROP TABLE IF EXISTS public.recruiter_payouts CASCADE;
DROP TABLE IF EXISTS public.recruiter_balances CASCADE;
DROP TABLE IF EXISTS public.recruiter_applications CASCADE;

-- Drop recruiter functions
DROP FUNCTION IF EXISTS public.generate_recruiter_id();
DROP FUNCTION IF EXISTS public.check_recruiter_commission_eligibility(uuid);

-- Remove recruiter columns from stores table
ALTER TABLE public.stores DROP COLUMN IF EXISTS recruited_by;
ALTER TABLE public.stores DROP COLUMN IF EXISTS recruiter_code;
ALTER TABLE public.stores DROP COLUMN IF EXISTS recruiter_commission_paid;
