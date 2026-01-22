-- Add attachment_url column to staff_chat_messages table
ALTER TABLE public.staff_chat_messages 
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Create storage bucket for staff chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-chat-attachments', 'staff-chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for staff to upload their own attachments
CREATE POLICY "Staff can upload own attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'staff-chat-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid()
  )
);

-- Create storage policy for authenticated users to view staff chat attachments
CREATE POLICY "Authenticated users can view staff chat attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'staff-chat-attachments');

-- Allow staff to delete their own attachments
CREATE POLICY "Staff can delete own attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'staff-chat-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);