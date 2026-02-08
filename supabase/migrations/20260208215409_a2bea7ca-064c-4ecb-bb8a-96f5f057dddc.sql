-- Create table to track Global Guard server slots per user
CREATE TABLE IF NOT EXISTS public.global_guard_server_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  base_servers INTEGER NOT NULL DEFAULT 2,
  additional_servers INTEGER NOT NULL DEFAULT 0,
  total_servers INTEGER GENERATED ALWAYS AS (base_servers + additional_servers) STORED,
  current_server_count INTEGER NOT NULL DEFAULT 0,
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'past_due', 'canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT global_guard_server_usage_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.global_guard_server_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own server usage"
  ON public.global_guard_server_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Only system can modify usage (via service role)
CREATE POLICY "Service role can manage server usage"
  ON public.global_guard_server_usage FOR ALL
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_global_guard_server_usage_updated_at
  BEFORE UPDATE ON public.global_guard_server_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_global_guard_server_usage_user_id ON public.global_guard_server_usage(user_id);
CREATE INDEX idx_global_guard_server_usage_stripe_sub ON public.global_guard_server_usage(stripe_subscription_id);

-- Update the get_global_guard_limits function to check actual subscription
CREATE OR REPLACE FUNCTION public.get_global_guard_limits(_user_id uuid)
RETURNS TABLE(max_servers integer, max_active_bans integer, has_priority_sync boolean, has_ban_templates boolean, is_premium boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_usage RECORD;
  v_is_eclipse_plus BOOLEAN;
BEGIN
  -- Check if user has Eclipse+ (which grants unlimited)
  v_is_eclipse_plus := public.has_premium_global_guard(_user_id);
  
  IF v_is_eclipse_plus THEN
    RETURN QUERY SELECT 
      NULL::integer as max_servers,
      NULL::integer as max_active_bans,
      true as has_priority_sync,
      true as has_ban_templates,
      true as is_premium;
    RETURN;
  END IF;
  
  -- Check for active Global Guard subscription
  SELECT * INTO v_usage
  FROM public.global_guard_server_usage
  WHERE user_id = _user_id
    AND status = 'active'
    AND billing_period_end > now();
  
  IF FOUND THEN
    -- User has an active Global Guard subscription
    RETURN QUERY SELECT 
      v_usage.total_servers as max_servers,
      NULL::integer as max_active_bans,
      true as has_priority_sync,
      true as has_ban_templates,
      true as is_premium;
  ELSE
    -- Free tier
    RETURN QUERY SELECT 
      2::integer as max_servers,
      NULL::integer as max_active_bans,
      false as has_priority_sync,
      false as has_ban_templates,
      false as is_premium;
  END IF;
END;
$function$;