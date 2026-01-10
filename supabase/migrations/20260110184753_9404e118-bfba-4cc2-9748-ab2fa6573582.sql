-- Create contact message replies table for threading
CREATE TABLE public.contact_message_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_message_id UUID NOT NULL REFERENCES public.contact_messages(id) ON DELETE CASCADE,
  reply_content TEXT NOT NULL,
  sent_by UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_message_replies ENABLE ROW LEVEL SECURITY;

-- Staff can view all replies
CREATE POLICY "Staff can view contact message replies"
ON public.contact_message_replies
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Staff can insert replies
CREATE POLICY "Staff can insert contact message replies"
ON public.contact_message_replies
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_contact_message_replies_message_id ON public.contact_message_replies(contact_message_id);

-- Enable realtime for contact_messages to get notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_messages;