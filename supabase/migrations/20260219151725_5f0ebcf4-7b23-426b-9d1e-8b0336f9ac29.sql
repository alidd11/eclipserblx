
-- Make attachment buckets private (no anonymous public access)
UPDATE storage.buckets SET public = false WHERE id IN (
  'chat-attachments',
  'admin-chat-attachments',
  'staff-chat-attachments',
  'seller-ticket-attachments'
);

-- Replace public SELECT policies with authenticated-only SELECT policies

-- chat-attachments: drop public select, create authenticated select
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
CREATE POLICY "Authenticated users can view chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-attachments');

-- admin-chat-attachments: already restricts to admin role for non-SELECT
-- Update SELECT to require admin role
DROP POLICY IF EXISTS "Admins can view attachments" ON storage.objects;
CREATE POLICY "Admins can view admin chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'admin-chat-attachments' 
  AND public.has_role(auth.uid(), 'admin')
);

-- staff-chat-attachments: update SELECT to require staff
DROP POLICY IF EXISTS "Staff can view attachments" ON storage.objects;
CREATE POLICY "Staff can view staff chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'staff-chat-attachments'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
);

-- seller-ticket-attachments: allow ticket participants to view
DROP POLICY IF EXISTS "Anyone can view ticket attachments" ON storage.objects;
CREATE POLICY "Authenticated users can view ticket attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'seller-ticket-attachments');
