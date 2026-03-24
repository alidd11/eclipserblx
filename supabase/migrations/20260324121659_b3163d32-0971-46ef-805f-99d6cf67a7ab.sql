CREATE POLICY "Staff can upload product assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-assets'
  AND is_staff(auth.uid())
);

CREATE POLICY "Staff can access product assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-assets'
  AND is_staff(auth.uid())
);

CREATE POLICY "Staff can delete product assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-assets'
  AND is_staff(auth.uid())
);