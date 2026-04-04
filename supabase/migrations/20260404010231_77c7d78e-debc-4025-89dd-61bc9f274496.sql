
-- 1. Fix product-assets storage: restrict to own store's files
-- File path format: {store_id}/{timestamp}-{random}.{ext}

DROP POLICY IF EXISTS "Store owners can download own product assets" ON storage.objects;
DROP POLICY IF EXISTS "Store owners can update product assets" ON storage.objects;
DROP POLICY IF EXISTS "Store owners can delete product assets" ON storage.objects;

CREATE POLICY "Store owners can download own product assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-assets'
  AND EXISTS (
    SELECT 1 FROM public.stores
    WHERE owner_id = auth.uid()
      AND id::text = split_part(storage.objects.name, '/', 1)
  )
);

CREATE POLICY "Store owners can update product assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-assets'
  AND EXISTS (
    SELECT 1 FROM public.stores
    WHERE owner_id = auth.uid()
      AND id::text = split_part(storage.objects.name, '/', 1)
  )
);

CREATE POLICY "Store owners can delete product assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-assets'
  AND EXISTS (
    SELECT 1 FROM public.stores
    WHERE owner_id = auth.uid()
      AND id::text = split_part(storage.objects.name, '/', 1)
  )
);

-- 2. Fix chat_conversations INSERT: enforce user_id ownership
DROP POLICY IF EXISTS "Users can create chats" ON public.chat_conversations;
CREATE POLICY "Users can create chats" ON public.chat_conversations
FOR INSERT TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());
