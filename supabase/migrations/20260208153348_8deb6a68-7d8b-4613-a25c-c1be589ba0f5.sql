-- Add tier-related columns to global_guard_settings
ALTER TABLE public.global_guard_settings
ADD COLUMN IF NOT EXISTS max_servers integer NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS max_active_bans integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS has_priority_sync boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS has_ban_templates boolean NOT NULL DEFAULT false;

-- Create ban templates table for premium users
CREATE TABLE public.global_ban_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  reason text,
  ban_type text NOT NULL DEFAULT 'permanent',
  duration text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_ban_type CHECK (ban_type IN ('permanent', 'temporary'))
);

-- Enable RLS
ALTER TABLE public.global_ban_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for ban templates
CREATE POLICY "Users can view their own templates"
ON public.global_ban_templates FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "Users can create their own templates"
ON public.global_ban_templates FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update their own templates"
ON public.global_ban_templates FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "Users can delete their own templates"
ON public.global_ban_templates FOR DELETE
TO authenticated
USING (owner_user_id = auth.uid());

-- Create function to check if user has premium Global Guard (Eclipse+ member)
CREATE OR REPLACE FUNCTION public.has_premium_global_guard(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND status = 'active'
  )
$$;

-- Create function to get user's Global Guard limits
CREATE OR REPLACE FUNCTION public.get_global_guard_limits(_user_id uuid)
RETURNS TABLE(
  max_servers integer,
  max_active_bans integer,
  has_priority_sync boolean,
  has_ban_templates boolean,
  is_premium boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_premium boolean;
BEGIN
  v_is_premium := public.has_premium_global_guard(_user_id);
  
  IF v_is_premium THEN
    -- Premium users (Eclipse+ members) get unlimited everything
    RETURN QUERY SELECT 
      NULL::integer as max_servers,
      NULL::integer as max_active_bans,
      true as has_priority_sync,
      true as has_ban_templates,
      true as is_premium;
  ELSE
    -- Free users get limited features
    RETURN QUERY SELECT 
      2::integer as max_servers,
      NULL::integer as max_active_bans,
      false as has_priority_sync,
      false as has_ban_templates,
      false as is_premium;
  END IF;
END;
$$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_global_ban_templates_owner ON public.global_ban_templates(owner_user_id);