
-- Admin-assigned custom IP Shield plans
CREATE TABLE public.ip_shield_custom_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tier TEXT NOT NULL DEFAULT 'custom',
  takedowns_per_month INTEGER NOT NULL DEFAULT 5,
  registry_limit INTEGER NOT NULL DEFAULT 25,
  priority BOOLEAN NOT NULL DEFAULT false,
  monitoring BOOLEAN NOT NULL DEFAULT false,
  dedicated_agent BOOLEAN NOT NULL DEFAULT false,
  label TEXT, -- e.g. "Partner Plan", "VIP"
  notes TEXT,
  assigned_by UUID,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.ip_shield_custom_plans ENABLE ROW LEVEL SECURITY;

-- Users can read their own plan
CREATE POLICY "Users can view their own custom plan"
  ON public.ip_shield_custom_plans FOR SELECT
  USING (auth.uid() = user_id);

-- Staff can manage all plans
CREATE POLICY "Staff can manage custom plans"
  ON public.ip_shield_custom_plans FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
