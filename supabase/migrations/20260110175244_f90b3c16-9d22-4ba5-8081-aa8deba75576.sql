-- Create contact_messages table
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by UUID,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for contact form submissions)
CREATE POLICY "Anyone can submit contact messages"
ON public.contact_messages
FOR INSERT
WITH CHECK (true);

-- Only staff can view contact messages
CREATE POLICY "Staff can view contact messages"
ON public.contact_messages
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Only staff can update contact messages
CREATE POLICY "Staff can update contact messages"
ON public.contact_messages
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()));

-- Only staff can delete contact messages
CREATE POLICY "Staff can delete contact messages"
ON public.contact_messages
FOR DELETE
TO authenticated
USING (public.is_staff(auth.uid()));