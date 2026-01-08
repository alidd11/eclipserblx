-- Remove the staff view policy and keep only admin access
DROP POLICY IF EXISTS "Staff can view discount codes" ON public.discount_codes;