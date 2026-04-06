
-- Fix: Team members can only upload product images to their own store's path
DROP POLICY IF EXISTS "Team members can upload product images" ON storage.objects;

CREATE POLICY "Team members can upload product images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.store_team_members stm
    WHERE stm.user_id = auth.uid()
    AND stm.accepted_at IS NOT NULL
    AND stm.store_id::text = split_part(objects.name, '/', 1)
  )
);
