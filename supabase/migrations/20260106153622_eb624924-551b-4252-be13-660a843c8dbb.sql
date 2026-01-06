-- Add unique constraint on applicant_email to limit 1 application per person
ALTER TABLE public.job_applications 
ADD CONSTRAINT job_applications_applicant_email_unique UNIQUE (applicant_email);

-- Create applicant_messages table for recruiter-to-applicant notifications
CREATE TABLE public.applicant_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_by UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.applicant_messages ENABLE ROW LEVEL SECURITY;

-- Staff can view and manage messages
CREATE POLICY "Staff can manage applicant messages"
ON public.applicant_messages
FOR ALL
USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'recruiter'::app_role)
);

-- Applicants can view their own messages via email lookup (public read for verification)
CREATE POLICY "Applicants can view their messages"
ON public.applicant_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.job_applications ja
        WHERE ja.id = applicant_messages.application_id
    )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.applicant_messages;