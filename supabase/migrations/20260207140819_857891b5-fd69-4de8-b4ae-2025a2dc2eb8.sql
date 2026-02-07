-- Create cron job to auto-register Discord commands daily at midnight UTC
-- This ensures commands stay synced even after Discord outages or drift

-- First, enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the auto-registration job to run daily at 00:05 UTC
-- Using 00:05 to avoid any midnight race conditions with other jobs
SELECT cron.schedule(
  'auto-register-discord-commands',
  '5 0 * * *',  -- At 00:05 every day
  $$
  SELECT net.http_post(
    url := current_setting('supabase_functions_endpoint') || '/auto-register-discord-commands',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-key', current_setting('supabase.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);