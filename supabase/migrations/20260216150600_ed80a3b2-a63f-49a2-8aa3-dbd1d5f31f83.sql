
-- Table to track the last processed audit log entry per guild
CREATE TABLE public.discord_audit_log_cursor (
  guild_id TEXT PRIMARY KEY,
  last_audit_log_id TEXT,
  last_polled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- No RLS needed - only accessed by edge functions via service role
ALTER TABLE public.discord_audit_log_cursor ENABLE ROW LEVEL SECURITY;

-- Schedule the polling every 2 minutes
SELECT cron.schedule(
  'poll-discord-audit-log',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/poll-discord-audit-log',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
