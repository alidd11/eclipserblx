-- Create table to store app version requirements for forced PWA updates
CREATE TABLE public.app_version (
  id TEXT PRIMARY KEY DEFAULT 'current',
  version TEXT NOT NULL DEFAULT '1.0.0',
  force_update BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by TEXT
);

-- Insert initial version record
INSERT INTO public.app_version (id, version, force_update) 
VALUES ('current', '1.0.0', false);

-- Enable RLS
ALTER TABLE public.app_version ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read version (needed for update checks from all clients)
CREATE POLICY "Anyone can read app version" 
ON public.app_version 
FOR SELECT 
USING (true);

-- Only admins can update version (correct param order: user_id, role)
CREATE POLICY "Admins can update app version" 
ON public.app_version 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for instant version updates to all PWAs
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_version;