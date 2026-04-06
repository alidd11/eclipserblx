-- Fix storage INSERT policy to scope uploads to own store path
DROP POLICY IF EXISTS "Store owners can upload product assets" ON storage.objects;
CREATE POLICY "Store owners can upload product assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-assets' AND
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.owner_id = auth.uid()
        AND (stores.id)::text = split_part(name, '/', 1)
    )
  );
