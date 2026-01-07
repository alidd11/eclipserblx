-- Create incidents table for tracking system outages and resolutions
CREATE TABLE public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'investigating',
  severity TEXT NOT NULL DEFAULT 'minor',
  affected_services TEXT[] DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Anyone can view incidents (public status page)
CREATE POLICY "Anyone can view incidents"
  ON public.incidents
  FOR SELECT
  USING (true);

-- Only admins can manage incidents
CREATE POLICY "Admins can manage incidents"
  ON public.incidents
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create incident updates table for timeline
CREATE TABLE public.incident_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;

-- Anyone can view incident updates
CREATE POLICY "Anyone can view incident updates"
  ON public.incident_updates
  FOR SELECT
  USING (true);

-- Only admins can manage incident updates
CREATE POLICY "Admins can manage incident updates"
  ON public.incident_updates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();