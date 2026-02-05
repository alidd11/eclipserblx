-- Add RLS policies for customer ticket access

-- Enable RLS on support_tickets if not already enabled
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Customers can view their own tickets
CREATE POLICY "Customers can view their own tickets"
ON public.support_tickets
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_staff(auth.uid())
);

-- Customers can create tickets
CREATE POLICY "Customers can create their own tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- Staff can update any ticket
CREATE POLICY "Staff can update any ticket"
ON public.support_tickets
FOR UPDATE
USING (public.is_staff(auth.uid()));

-- Enable RLS on ticket_messages if not already enabled
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages on their tickets, staff can see all
CREATE POLICY "Users can view messages on their tickets"
ON public.ticket_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ticket_id
    AND (st.user_id = auth.uid() OR public.is_staff(auth.uid()))
  )
);

-- Users can insert messages on their tickets
CREATE POLICY "Users can send messages on their tickets"
ON public.ticket_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ticket_id
    AND (st.user_id = auth.uid() OR public.is_staff(auth.uid()))
  )
  AND sender_id = auth.uid()
);

-- Add ticket_number column to support_tickets for friendly IDs
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS ticket_number text UNIQUE;

-- Add category column
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS category text;

-- Create function to generate customer ticket number
CREATE OR REPLACE FUNCTION public.generate_customer_ticket_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  number_exists BOOLEAN;
BEGIN
  LOOP
    new_number := 'TKT-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
    SELECT EXISTS(SELECT 1 FROM support_tickets WHERE ticket_number = new_number) INTO number_exists;
    EXIT WHEN NOT number_exists;
  END LOOP;
  RETURN new_number;
END;
$$;

-- Create trigger to auto-assign ticket_number
CREATE OR REPLACE FUNCTION public.set_support_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := generate_customer_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_support_ticket_number_trigger ON public.support_tickets;
CREATE TRIGGER set_support_ticket_number_trigger
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_support_ticket_number();

-- Enable realtime for ticket messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;