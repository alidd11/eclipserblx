-- Create table for Global Guard guild-specific settings
CREATE TABLE public.global_guard_guild_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL UNIQUE,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_channel_id TEXT,
  log_channel_name TEXT,
  ping_role_id TEXT,
  ping_role_name TEXT,
  log_bans BOOLEAN DEFAULT true,
  log_unbans BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_guard_guild_settings ENABLE ROW LEVEL SECURITY;

-- Users can view/manage their own guild settings
CREATE POLICY "Users can view own guild settings"
ON public.global_guard_guild_settings FOR SELECT
USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can insert own guild settings"
ON public.global_guard_guild_settings FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update own guild settings"
ON public.global_guard_guild_settings FOR UPDATE
USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete own guild settings"
ON public.global_guard_guild_settings FOR DELETE
USING (auth.uid() = owner_user_id);

-- Service role can access all for bot operations
CREATE POLICY "Service role full access"
ON public.global_guard_guild_settings FOR ALL
USING (true)
WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_global_guard_guild_settings_updated_at
BEFORE UPDATE ON public.global_guard_guild_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();