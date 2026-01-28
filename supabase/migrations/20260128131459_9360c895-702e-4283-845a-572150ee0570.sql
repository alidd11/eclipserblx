-- Create discord_polls table to store polls/surveys
CREATE TABLE public.discord_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  poll_type TEXT NOT NULL DEFAULT 'poll' CHECK (poll_type IN ('poll', 'survey')),
  options JSONB NOT NULL DEFAULT '[]',
  duration_hours INTEGER,
  allow_multiple_answers BOOLEAN DEFAULT false,
  discord_message_id TEXT,
  posted_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'ended')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discord_polls ENABLE ROW LEVEL SECURITY;

-- Allow staff to view polls
CREATE POLICY "Staff can view polls"
  ON public.discord_polls
  FOR SELECT
  USING (public.is_staff(auth.uid()));

-- Allow support agents and admins to create/update polls
CREATE POLICY "Support and admin can manage polls"
  ON public.discord_polls
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'support_agent')
  );

-- Add trigger for updated_at
CREATE TRIGGER update_discord_polls_updated_at
  BEFORE UPDATE ON public.discord_polls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();