-- Phase 0: Feature Flag System for Marketplace Beta Access

-- Feature flags table for beta access control
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  user_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can read feature flags (needed to check access)
CREATE POLICY "Anyone can read feature flags" 
ON public.feature_flags 
FOR SELECT 
USING (true);

-- Only admins can modify feature flags
CREATE POLICY "Admins can manage feature flags" 
ON public.feature_flags 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.staff_id IS NOT NULL
  )
);

-- Insert marketplace feature flag (we'll add user IDs after)
INSERT INTO public.feature_flags (name, description, enabled, user_ids) 
VALUES (
  'marketplace', 
  'Multi-vendor marketplace beta - allows users to create stores and sell products',
  true, 
  '{}'
);

-- Add updated_at trigger
CREATE TRIGGER update_feature_flags_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();