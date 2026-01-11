-- Forum Reports table for customer forum reports
CREATE TABLE public.forum_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  staff_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT forum_reports_has_target CHECK (thread_id IS NOT NULL OR post_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.forum_reports ENABLE ROW LEVEL SECURITY;

-- Users can create their own reports
CREATE POLICY "Users can create forum reports"
ON public.forum_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own forum reports"
ON public.forum_reports
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id OR public.is_staff(auth.uid()));

-- Staff can update reports (resolve, respond)
CREATE POLICY "Staff can update forum reports"
ON public.forum_reports
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()));

-- Create indexes
CREATE INDEX idx_forum_reports_status ON public.forum_reports(status);
CREATE INDEX idx_forum_reports_thread ON public.forum_reports(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_forum_reports_post ON public.forum_reports(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_forum_reports_reporter ON public.forum_reports(reporter_id);

-- User IP tracking table (admin-only access)
CREATE TABLE public.user_ip_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ip_address TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_ip_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view IP logs
CREATE POLICY "Only admins can view IP logs"
ON public.user_ip_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert logs (from edge functions)
CREATE POLICY "Service can insert IP logs"
ON public.user_ip_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

-- Index for faster lookups
CREATE INDEX idx_user_ip_logs_user ON public.user_ip_logs(user_id);
CREATE INDEX idx_user_ip_logs_ip ON public.user_ip_logs(ip_address);

-- Add is_open column to job_applications if not exists
ALTER TABLE public.job_applications 
ADD COLUMN IF NOT EXISTS is_open BOOLEAN NOT NULL DEFAULT true;

-- Enable realtime for forum reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_reports;