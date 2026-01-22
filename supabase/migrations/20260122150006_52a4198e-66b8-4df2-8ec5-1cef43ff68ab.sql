-- Discord Modmail Tickets table
CREATE TABLE public.discord_modmail_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  discord_avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'closed')),
  claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Discord Modmail Messages table
CREATE TABLE public.discord_modmail_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.discord_modmail_tickets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_staff_reply BOOLEAN NOT NULL DEFAULT false,
  staff_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  discord_message_id TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_modmail_tickets_status ON public.discord_modmail_tickets(status);
CREATE INDEX idx_modmail_tickets_discord_user ON public.discord_modmail_tickets(discord_user_id);
CREATE INDEX idx_modmail_messages_ticket ON public.discord_modmail_messages(ticket_id);

-- Enable RLS
ALTER TABLE public.discord_modmail_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_modmail_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Staff only access
CREATE POLICY "Staff can view modmail tickets"
ON public.discord_modmail_tickets
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update modmail tickets"
ON public.discord_modmail_tickets
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can view modmail messages"
ON public.discord_modmail_messages
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert modmail messages"
ON public.discord_modmail_messages
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

-- Service role insert policy for webhook
CREATE POLICY "Service role can insert tickets"
ON public.discord_modmail_tickets
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can insert messages"
ON public.discord_modmail_messages
FOR INSERT
TO service_role
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_modmail_tickets_updated_at
BEFORE UPDATE ON public.discord_modmail_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.discord_modmail_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discord_modmail_messages;