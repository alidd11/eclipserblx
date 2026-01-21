-- Create storage bucket for store branding images (logos and banners)
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-branding', 'store-branding', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own store folder
CREATE POLICY "Users can upload store branding images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-branding' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own store branding images
CREATE POLICY "Users can update their own store branding images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-branding' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own store branding images
CREATE POLICY "Users can delete their own store branding images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-branding' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access for store branding images
CREATE POLICY "Store branding images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'store-branding');