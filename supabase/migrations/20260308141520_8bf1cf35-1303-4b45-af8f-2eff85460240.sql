-- Fix: affiliate_applications staff policies check ANY role instead of staff-level roles
-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Staff can view all applications" ON public.affiliate_applications;
DROP POLICY IF EXISTS "Staff can update applications" ON public.affiliate_applications;

-- Recreate with proper staff check using has_role function
CREATE POLICY "Staff can view all applications" ON public.affiliate_applications
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

CREATE POLICY "Staff can update applications" ON public.affiliate_applications
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- Fix: seller_agreements publicly readable - restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can check store agreement status" ON public.seller_agreements;

CREATE POLICY "Store owners and staff can view agreements" ON public.seller_agreements
FOR SELECT TO authenticated
USING (
  signed_by = auth.uid() OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'moderator')
);