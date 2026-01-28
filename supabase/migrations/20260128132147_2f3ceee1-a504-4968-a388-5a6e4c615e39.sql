-- Create QOTD table for Question of the Day feature
CREATE TABLE public.discord_qotd (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL,
    is_auto_generated BOOLEAN DEFAULT false,
    category TEXT,
    posted_at TIMESTAMP WITH TIME ZONE,
    discord_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'posted')),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discord_qotd ENABLE ROW LEVEL SECURITY;

-- Staff can view all QOTDs
CREATE POLICY "Staff can view QOTDs" ON public.discord_qotd
    FOR SELECT TO authenticated
    USING (public.is_staff(auth.uid()));

-- Admin and support agents can manage QOTDs
CREATE POLICY "Admin and support can manage QOTDs" ON public.discord_qotd
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support_agent'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support_agent'));

-- Add updated_at trigger
CREATE TRIGGER update_discord_qotd_updated_at
    BEFORE UPDATE ON public.discord_qotd
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for status queries
CREATE INDEX idx_discord_qotd_status ON public.discord_qotd(status);
CREATE INDEX idx_discord_qotd_scheduled ON public.discord_qotd(scheduled_for) WHERE status = 'scheduled';