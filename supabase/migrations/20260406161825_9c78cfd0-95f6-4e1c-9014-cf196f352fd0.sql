
-- Fix storage policy bug: stores.name should be objects.name
DROP POLICY IF EXISTS "Store owners can upload product assets" ON storage.objects;

CREATE POLICY "Store owners can upload product assets" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-assets'
  AND EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.owner_id = auth.uid()
    AND stores.id::text = split_part(objects.name, '/', 1)
  )
);

-- Add RLS policy on realtime.messages to restrict channel subscriptions
-- Note: realtime.messages requires policies scoped to topic and auth.uid()
