-- Create seller support tickets table
CREATE TABLE public.seller_support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('account_link_change', 'payout_issue', 'product_issue', 'technical_support', 'policy_question', 'other')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- For account link changes
  link_change_type TEXT CHECK (link_change_type IN ('discord', 'roblox', 'both')),
  new_discord_username TEXT,
  new_roblox_username TEXT,
  change_reason TEXT,
  
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'awaiting_seller', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  assigned_to UUID,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket messages table for conversation thread
CREATE TABLE public.seller_ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.seller_support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for seller_support_tickets
CREATE POLICY "Sellers can view their own tickets"
  ON public.seller_support_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Sellers can create tickets"
  ON public.seller_support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sellers can update their own open tickets"
  ON public.seller_support_tickets FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('open', 'awaiting_seller'));

CREATE POLICY "Staff can view all tickets"
  ON public.seller_support_tickets FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update any ticket"
  ON public.seller_support_tickets FOR UPDATE
  USING (public.is_staff(auth.uid()));

-- RLS policies for seller_ticket_messages
CREATE POLICY "Users can view messages for their tickets"
  ON public.seller_ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.seller_support_tickets 
      WHERE id = ticket_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add messages to their tickets"
  ON public.seller_ticket_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.seller_support_tickets 
      WHERE id = ticket_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all messages"
  ON public.seller_ticket_messages FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can add messages"
  ON public.seller_ticket_messages FOR INSERT
  WITH CHECK (public.is_staff(auth.uid()));

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
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
    SELECT EXISTS(SELECT 1 FROM seller_support_tickets WHERE ticket_number = new_number) INTO number_exists;
    EXIT WHEN NOT number_exists;
  END LOOP;
  RETURN new_number;
END;
$$;

-- Trigger to auto-generate ticket number
CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_seller_ticket_number
  BEFORE INSERT ON public.seller_support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_ticket_number();

-- Trigger for updated_at
CREATE TRIGGER update_seller_support_tickets_updated_at
  BEFORE UPDATE ON public.seller_support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for ticket messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_ticket_messages;