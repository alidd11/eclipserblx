-- Create a table for message read receipts
CREATE TABLE public.staff_message_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.staff_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.staff_message_reads ENABLE ROW LEVEL SECURITY;

-- Staff can view all read receipts
CREATE POLICY "Staff can view read receipts"
ON public.staff_message_reads
FOR SELECT
USING (is_staff(auth.uid()));

-- Staff can insert their own read receipts
CREATE POLICY "Staff can mark messages as read"
ON public.staff_message_reads
FOR INSERT
WITH CHECK (is_staff(auth.uid()) AND user_id = auth.uid());

-- Enable realtime for read receipts
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_message_reads;