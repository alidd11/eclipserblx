-- Add issue_category column to chat_conversations
ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS issue_category text;

-- Create a storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view chat attachments (public bucket)
CREATE POLICY "Anyone can view chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

-- Allow authenticated users to upload chat attachments
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL);

-- Allow staff to upload chat attachments (for agents)
CREATE POLICY "Staff can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments' AND public.is_staff(auth.uid()));

-- Allow staff to delete chat attachments
CREATE POLICY "Staff can delete chat attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-attachments' AND public.is_staff(auth.uid()));

-- Add attachment_url column to chat_messages for file attachments
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS attachment_url text;