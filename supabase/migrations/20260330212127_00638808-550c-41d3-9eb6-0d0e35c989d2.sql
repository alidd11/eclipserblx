
-- 1. FIX: Staff-chat-attachments - require actual staff role
DROP POLICY IF EXISTS "Staff can view staff chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Staff can view staff chat attachments (fixed)" ON storage.objects;
CREATE POLICY "Staff can view staff chat attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'staff-chat-attachments'
    AND is_staff(auth.uid())
  );

-- 2. FIX: Chat-attachments - restrict to folder owner + staff
DROP POLICY IF EXISTS "Authenticated users can view chat attachments" ON storage.objects;
CREATE POLICY "Chat attachment owners and staff can view"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (
      is_staff(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- 3. FIX: Support-ticket-attachments - restrict to folder owner + staff
DROP POLICY IF EXISTS "Authenticated users can view support ticket attachments" ON storage.objects;
CREATE POLICY "Ticket owners and staff can view support attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'support-ticket-attachments'
    AND (
      is_staff(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- 4. FIX: Seller-ticket-attachments - restrict to folder owner + staff
DROP POLICY IF EXISTS "Authenticated users can view ticket attachments" ON storage.objects;
CREATE POLICY "Seller ticket owners and staff can view attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'seller-ticket-attachments'
    AND (
      is_staff(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- 5. FIX: Products asset_file_url - revoke anon SELECT on sensitive column
REVOKE SELECT (asset_file_url) ON public.products FROM anon;

-- 6. FIX: Store credentials - restrict to admin/lead_admin only
DROP POLICY IF EXISTS "Staff view store creds" ON public.store_credentials;
CREATE POLICY "Admins view store creds"
  ON public.store_credentials FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'lead_administrator')
  );

-- 7. FIX: Seller discount codes - remove public enumeration
DROP POLICY IF EXISTS "Anyone can validate active discount codes" ON public.seller_discount_codes;
CREATE POLICY "Authenticated users can validate discount codes"
  ON public.seller_discount_codes FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 8. FIX: Dispute evidence storage - fix broken join
DROP POLICY IF EXISTS "Sellers can view dispute evidence for their store" ON storage.objects;
CREATE POLICY "Sellers can view dispute evidence for their store"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'dispute-evidence'
    AND EXISTS (
      SELECT 1
      FROM dispute_evidence de
      JOIN refund_requests r ON r.id = de.dispute_id
      JOIN stores s ON s.id = r.store_id
      WHERE de.file_path = name
        AND s.owner_id = auth.uid()
    )
  );
