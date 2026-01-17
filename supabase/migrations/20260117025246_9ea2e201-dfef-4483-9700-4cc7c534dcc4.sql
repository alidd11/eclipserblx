-- Create page_visits table for tracking visitor analytics
CREATE TABLE public.page_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  is_new_visitor BOOLEAN NOT NULL DEFAULT true,
  user_agent TEXT,
  referrer TEXT,
  ip_hash TEXT,
  country TEXT,
  device_type TEXT,
  browser TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_page_visits_page_path ON public.page_visits(page_path);
CREATE INDEX idx_page_visits_created_at ON public.page_visits(created_at DESC);
CREATE INDEX idx_page_visits_visitor_id ON public.page_visits(visitor_id);
CREATE INDEX idx_page_visits_is_new ON public.page_visits(is_new_visitor);

-- Enable RLS
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert page visits (anonymous tracking)
CREATE POLICY "Anyone can insert page visits"
  ON public.page_visits
  FOR INSERT
  WITH CHECK (true);

-- Only staff can view page visits
CREATE POLICY "Staff can view page visits"
  ON public.page_visits
  FOR SELECT
  USING (public.is_staff(auth.uid()));

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.page_visits;