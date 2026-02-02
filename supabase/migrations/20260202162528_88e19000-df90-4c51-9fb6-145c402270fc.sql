-- Allow admins to upload to any store-branding folder
CREATE POLICY "Admins can upload store branding images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'store-branding' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'lead_administrator')
  )
);

-- Allow admins to update any store branding images
CREATE POLICY "Admins can update store branding images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'store-branding' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'lead_administrator')
  )
);

-- Allow admins to delete any store branding images
CREATE POLICY "Admins can delete store branding images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'store-branding' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'lead_administrator')
  )
);