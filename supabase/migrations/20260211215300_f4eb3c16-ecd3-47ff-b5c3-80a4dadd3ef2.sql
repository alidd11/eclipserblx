
-- Allow store owners to upload product images
CREATE POLICY "Store owners can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.stores
    WHERE owner_id = auth.uid()
  )
);

-- Allow store owners to update their product images
CREATE POLICY "Store owners can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.stores
    WHERE owner_id = auth.uid()
  )
);

-- Allow store owners to delete their product images
CREATE POLICY "Store owners can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.stores
    WHERE owner_id = auth.uid()
  )
);

-- Allow store owners to upload product assets (downloadable files)
CREATE POLICY "Store owners can upload product assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-assets'
  AND EXISTS (
    SELECT 1 FROM public.stores
    WHERE owner_id = auth.uid()
  )
);

-- Allow store owners to update their product assets
CREATE POLICY "Store owners can update product assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-assets'
  AND EXISTS (
    SELECT 1 FROM public.stores
    WHERE owner_id = auth.uid()
  )
);

-- Allow store owners to delete their product assets
CREATE POLICY "Store owners can delete product assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-assets'
  AND EXISTS (
    SELECT 1 FROM public.stores
    WHERE owner_id = auth.uid()
  )
);
