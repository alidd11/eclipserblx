-- Create table to track Discord server outreach for marketplace recruitment
CREATE TABLE public.discord_outreach (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    server_name TEXT NOT NULL,
    server_id TEXT,
    contact_name TEXT,
    contact_discord TEXT,
    member_count INTEGER,
    server_type TEXT,
    status TEXT NOT NULL DEFAULT 'contacted',
    decision TEXT,
    notes TEXT,
    contacted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_followup_at TIMESTAMP WITH TIME ZONE,
    decided_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discord_outreach ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Staff can manage discord outreach"
ON public.discord_outreach
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'recruiter', 'support_agent')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'recruiter', 'support_agent')
    )
);

-- Create trigger for updated_at
CREATE TRIGGER update_discord_outreach_updated_at
BEFORE UPDATE ON public.discord_outreach
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for common queries
CREATE INDEX idx_discord_outreach_status ON public.discord_outreach(status);
CREATE INDEX idx_discord_outreach_created_at ON public.discord_outreach(created_at DESC);