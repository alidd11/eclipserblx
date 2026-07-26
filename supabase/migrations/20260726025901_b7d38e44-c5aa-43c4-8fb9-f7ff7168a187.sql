
-- 1) store_credentials: remove admin raw-secret exposure
DROP POLICY IF EXISTS "Admins view store creds" ON public.store_credentials;

-- 2) store_payment_details: remove staff direct SELECT on raw bank details
DROP POLICY IF EXISTS "Staff with manage_payouts can view store payment details" ON public.store_payment_details;

-- 3) seller_documents: add missing write policies (staff only)
CREATE POLICY "Staff can insert seller documents"
  ON public.seller_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'manage_seller_documents'));

CREATE POLICY "Staff can update seller documents"
  ON public.seller_documents
  FOR UPDATE
  TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_seller_documents'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_seller_documents'));

CREATE POLICY "Staff can delete seller documents"
  ON public.seller_documents
  FOR DELETE
  TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_seller_documents'));

-- 4) user_roles: consolidate duplicate policies to canonical manage_user_roles
DROP POLICY IF EXISTS "Staff can assign roles at or below their level" ON public.user_roles;
DROP POLICY IF EXISTS "Staff can remove roles at or below their level" ON public.user_roles;
