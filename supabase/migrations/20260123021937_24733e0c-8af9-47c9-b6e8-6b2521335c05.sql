-- Create activity types enum
CREATE TYPE public.outreach_activity_type AS ENUM (
  'created',
  'contacted',
  'follow_up',
  'status_change',
  'decision',
  'note'
);

-- Create activity log table for discord outreach
CREATE TABLE public.discord_outreach_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_id UUID NOT NULL REFERENCES public.discord_outreach(id) ON DELETE CASCADE,
  activity_type outreach_activity_type NOT NULL,
  description TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.discord_outreach_activity ENABLE ROW LEVEL SECURITY;

-- RLS policies matching discord_outreach (admin and recruiter access)
CREATE POLICY "Admins and recruiters can view outreach activity"
ON public.discord_outreach_activity
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'recruiter')
);

CREATE POLICY "Admins and recruiters can insert outreach activity"
ON public.discord_outreach_activity
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'recruiter')
);

-- Index for faster lookups
CREATE INDEX idx_outreach_activity_outreach_id ON public.discord_outreach_activity(outreach_id);
CREATE INDEX idx_outreach_activity_created_at ON public.discord_outreach_activity(created_at DESC);