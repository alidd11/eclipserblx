-- Fix admin-chat-attachments storage policies
-- 1. Add INSERT policy for staff (anyone with is_staff check)
CREATE POLICY "Staff can upload admin chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'admin-chat-attachments'
  AND is_staff(auth.uid())
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Add UPDATE policy for staff (needed for some upload flows)
CREATE POLICY "Staff can update own admin chat attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'admin-chat-attachments'
  AND is_staff(auth.uid())
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Fix SELECT policy - allow all staff to view (not just admin role)
DROP POLICY IF EXISTS "Admins can view admin chat attachments" ON storage.objects;

CREATE POLICY "Staff can view admin chat attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'admin-chat-attachments'
  AND is_staff(auth.uid())
);