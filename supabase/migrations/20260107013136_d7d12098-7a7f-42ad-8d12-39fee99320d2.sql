-- Create staff messages table for internal staff communication
CREATE TABLE public.staff_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID, -- NULL means broadcast to all staff
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;

-- Staff can view messages sent to them or broadcast messages
CREATE POLICY "Staff can view their messages"
ON public.staff_messages
FOR SELECT
USING (
  is_staff(auth.uid()) AND (
    recipient_id = auth.uid() OR 
    recipient_id IS NULL OR 
    sender_id = auth.uid()
  )
);

-- Staff can send messages
CREATE POLICY "Staff can send messages"
ON public.staff_messages
FOR INSERT
WITH CHECK (
  is_staff(auth.uid()) AND sender_id = auth.uid()
);

-- Staff can mark their own messages as read
CREATE POLICY "Staff can update read status"
ON public.staff_messages
FOR UPDATE
USING (
  is_staff(auth.uid()) AND (recipient_id = auth.uid() OR recipient_id IS NULL)
);

-- Enable realtime for staff messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_messages;