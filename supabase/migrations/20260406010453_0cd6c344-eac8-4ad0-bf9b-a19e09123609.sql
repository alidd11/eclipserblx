-- Fix product-images storage: add path-ownership check
-- Drop existing overly-permissive write policies
DROP POLICY IF EXISTS "Store owners can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Store owners can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Store owners can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can delete product images" ON storage.objects;

-- Recreate with path-ownership validation
CREATE POLICY "Sellers can upload own product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.stores
    WHERE owner_id = auth.uid()
      AND id::text = split_part(name, '/', 1)
  )
);

CREATE POLICY "Sellers can update own product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.stores
    WHERE owner_id = auth.uid()
      AND id::text = split_part(name, '/', 1)
  )
);

CREATE POLICY "Sellers can delete own product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.stores
    WHERE owner_id = auth.uid()
      AND id::text = split_part(name, '/', 1)
  )
);