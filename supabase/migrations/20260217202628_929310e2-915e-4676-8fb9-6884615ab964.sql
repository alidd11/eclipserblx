-- Add attachment_url column to seller_ticket_messages
ALTER TABLE public.seller_ticket_messages
ADD COLUMN attachment_url TEXT;

-- Create storage bucket for seller ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('seller-ticket-attachments', 'seller-ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload ticket attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'seller-ticket-attachments'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view ticket attachments (public bucket)
CREATE POLICY "Anyone can view ticket attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'seller-ticket-attachments');

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete own ticket attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'seller-ticket-attachments'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);