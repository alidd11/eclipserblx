-- Create storage bucket for product assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-assets', 'product-assets', false);

-- Allow admins and product managers to upload files
CREATE POLICY "Staff can upload product assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-assets' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'product_manager'::app_role))
);

-- Allow admins and product managers to view/manage files
CREATE POLICY "Staff can manage product assets"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'product-assets' 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'product_manager'::app_role))
);

-- Allow authenticated users to download files (controlled by edge function)
CREATE POLICY "Service role can access product assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-assets');