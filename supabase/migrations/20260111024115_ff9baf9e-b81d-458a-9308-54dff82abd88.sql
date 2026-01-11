-- Create staff chat messages table
CREATE TABLE public.staff_chat_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_chat_messages ENABLE ROW LEVEL SECURITY;

-- Staff can view all messages
CREATE POLICY "Staff can view staff chat messages"
ON public.staff_chat_messages
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Staff can insert their own messages
CREATE POLICY "Staff can send staff chat messages"
ON public.staff_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_staff(auth.uid()) AND
    auth.uid() = user_id
);

-- Admins can delete any message, staff can delete their own
CREATE POLICY "Admins can delete any staff chat message"
ON public.staff_chat_messages
FOR DELETE
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR
    auth.uid() = user_id
);

-- Enable realtime
ALTER TABLE public.staff_chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_chat_messages;