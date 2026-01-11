-- Create admin chat messages table
CREATE TABLE public.admin_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin-only access
CREATE POLICY "Admins can view admin chat messages"
ON public.admin_chat_messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert admin chat messages"
ON public.admin_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = user_id);

CREATE POLICY "Admins can delete admin chat messages"
ON public.admin_chat_messages
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_chat_messages;

-- Create storage bucket for admin chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-chat-attachments', 'admin-chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for admin-chat-attachments bucket
CREATE POLICY "Admins can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'admin-chat-attachments' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can view attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'admin-chat-attachments' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'admin-chat-attachments' 
  AND public.has_role(auth.uid(), 'admin')
);