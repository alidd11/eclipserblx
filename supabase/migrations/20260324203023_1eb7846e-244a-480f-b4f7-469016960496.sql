
-- Create private storage bucket for customer support ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-ticket-attachments', 'support-ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload support ticket attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'support-ticket-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view support ticket attachments
CREATE POLICY "Authenticated users can view support ticket attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'support-ticket-attachments');

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete own support ticket attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'support-ticket-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
