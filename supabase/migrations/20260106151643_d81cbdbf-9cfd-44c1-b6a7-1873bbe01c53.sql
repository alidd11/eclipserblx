-- Create job_applications table
CREATE TABLE public.job_applications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    position TEXT NOT NULL,
    applicant_name TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    discord_username TEXT,
    portfolio_url TEXT,
    experience TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Recruiters and admins can view applications
CREATE POLICY "Recruiters and admins can view applications"
ON public.job_applications
FOR SELECT
USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'recruiter'::app_role)
);

-- Admins can manage all applications
CREATE POLICY "Admins can manage applications"
ON public.job_applications
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Recruiters can update applications (status, notes)
CREATE POLICY "Recruiters can update applications"
ON public.job_applications
FOR UPDATE
USING (has_role(auth.uid(), 'recruiter'::app_role));

-- Anyone can submit applications (public)
CREATE POLICY "Anyone can submit applications"
ON public.job_applications
FOR INSERT
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_job_applications_updated_at
BEFORE UPDATE ON public.job_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();