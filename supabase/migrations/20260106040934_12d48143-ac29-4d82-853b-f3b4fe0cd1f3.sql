-- Create a public bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view product images
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Allow staff to upload product images
CREATE POLICY "Staff can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND public.is_staff(auth.uid()));

-- Allow staff to update product images
CREATE POLICY "Staff can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND public.is_staff(auth.uid()));

-- Allow staff to delete product images
CREATE POLICY "Staff can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND public.is_staff(auth.uid()));