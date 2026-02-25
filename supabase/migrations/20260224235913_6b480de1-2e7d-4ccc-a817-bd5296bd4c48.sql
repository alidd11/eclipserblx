
-- Add offender tracking fields to takedown_requests
ALTER TABLE public.takedown_requests 
  ADD COLUMN IF NOT EXISTS offender_roblox_id text,
  ADD COLUMN IF NOT EXISTS offender_roblox_username text,
  ADD COLUMN IF NOT EXISTS last_recheck_at timestamptz,
  ADD COLUMN IF NOT EXISTS recheck_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recheck_results jsonb;
