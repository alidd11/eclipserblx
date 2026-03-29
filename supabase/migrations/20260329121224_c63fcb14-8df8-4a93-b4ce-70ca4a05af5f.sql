
-- Auto-mod configuration per guild
CREATE TABLE public.bot_automod_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'word_filter',
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  action TEXT NOT NULL DEFAULT 'delete',
  heat_points INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Heat tracking for auto-mod escalation
CREATE TABLE public.bot_automod_heat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  user_discord_id TEXT NOT NULL,
  heat_points INTEGER NOT NULL DEFAULT 0,
  last_infraction_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decay_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(guild_id, user_discord_id)
);

-- Reaction roles
CREATE TABLE public.bot_reaction_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT,
  title TEXT NOT NULL DEFAULT 'Choose your roles',
  description TEXT,
  color TEXT DEFAULT '#7C3AED',
  type TEXT NOT NULL DEFAULT 'toggle',
  roles JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Custom commands / auto-responder
CREATE TABLE public.bot_custom_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'command',
  trigger TEXT NOT NULL,
  response TEXT NOT NULL,
  embed_config JSONB,
  enabled BOOLEAN NOT NULL DEFAULT true,
  cooldown_seconds INTEGER DEFAULT 0,
  allowed_roles TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Giveaways
CREATE TABLE public.bot_giveaways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  prize TEXT NOT NULL,
  winners_count INTEGER NOT NULL DEFAULT 1,
  entries JSONB DEFAULT '[]',
  required_role_id TEXT,
  ends_at TIMESTAMPTZ NOT NULL,
  ended BOOLEAN DEFAULT false,
  winner_ids TEXT[] DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Starboard config
CREATE TABLE public.bot_starboard_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  channel_id TEXT,
  emoji TEXT NOT NULL DEFAULT '⭐',
  threshold INTEGER NOT NULL DEFAULT 3,
  self_star BOOLEAN DEFAULT false,
  ignored_channels TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Starboard entries
CREATE TABLE public.bot_starboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  source_message_id TEXT NOT NULL UNIQUE,
  starboard_message_id TEXT,
  channel_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  star_count INTEGER NOT NULL DEFAULT 0,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Suggestions
CREATE TABLE public.bot_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  channel_id TEXT,
  message_id TEXT,
  author_id TEXT NOT NULL,
  author_username TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  staff_response TEXT,
  responded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Suggestions config
CREATE TABLE public.bot_suggestions_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  channel_id TEXT,
  review_channel_id TEXT,
  allow_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Verification gate config
CREATE TABLE public.bot_verification_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  type TEXT NOT NULL DEFAULT 'button',
  channel_id TEXT,
  verified_role_id TEXT,
  message_title TEXT DEFAULT 'Verify to Access',
  message_description TEXT DEFAULT 'Click the button below to verify yourself.',
  captcha_enabled BOOLEAN DEFAULT false,
  min_account_age_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Join gate filters
CREATE TABLE public.bot_join_gate_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  min_account_age_days INTEGER DEFAULT 7,
  require_avatar BOOLEAN DEFAULT false,
  require_verified_email BOOLEAN DEFAULT false,
  block_bots BOOLEAN DEFAULT false,
  action TEXT NOT NULL DEFAULT 'kick',
  log_channel_id TEXT,
  whitelist_role_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scheduled messages
CREATE TABLE public.bot_scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  content TEXT,
  embed_config JSONB,
  cron_expression TEXT,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  repeat BOOLEAN DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-role on join
CREATE TABLE public.bot_auto_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  role_name TEXT,
  delay_seconds INTEGER DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(guild_id, role_id)
);

-- Mod log channel config
CREATE TABLE public.bot_mod_log_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  channel_id TEXT,
  log_bans BOOLEAN DEFAULT true,
  log_kicks BOOLEAN DEFAULT true,
  log_timeouts BOOLEAN DEFAULT true,
  log_message_deletes BOOLEAN DEFAULT true,
  log_message_edits BOOLEAN DEFAULT true,
  log_role_changes BOOLEAN DEFAULT true,
  log_member_joins BOOLEAN DEFAULT true,
  log_member_leaves BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Join/leave announcement config
CREATE TABLE public.bot_join_leave_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL UNIQUE,
  join_enabled BOOLEAN DEFAULT false,
  join_channel_id TEXT,
  join_message TEXT DEFAULT '{user} just joined {server}! Welcome!',
  join_embed_config JSONB,
  leave_enabled BOOLEAN DEFAULT false,
  leave_channel_id TEXT,
  leave_message TEXT DEFAULT '{user} has left the server.',
  leave_embed_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.bot_automod_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_automod_heat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_reaction_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_custom_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_giveaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_starboard_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_starboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_suggestions_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_verification_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_join_gate_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_auto_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_mod_log_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_join_leave_config ENABLE ROW LEVEL SECURITY;

-- RLS policies - admin access for all bot config tables
CREATE POLICY "Admins can manage bot_automod_rules" ON public.bot_automod_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage bot_automod_heat" ON public.bot_automod_heat FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage bot_reaction_roles" ON public.bot_reaction_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage bot_custom_commands" ON public.bot_custom_commands FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage bot_giveaways" ON public.bot_giveaways FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage bot_starboard_config" ON public.bot_starboard_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage bot_starboard_entries" ON public.bot_starboard_entries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage bot_suggestions" ON public.bot_suggestions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage bot_suggestions_config" ON public.bot_suggestions_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage bot_verification_config" ON public.bot_verification_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage bot_join_gate_config" ON public.bot_join_gate_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage bot_scheduled_messages" ON public.bot_scheduled_messages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage bot_auto_roles" ON public.bot_auto_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage bot_mod_log_config" ON public.bot_mod_log_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage bot_join_leave_config" ON public.bot_join_leave_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role access for bot operations
CREATE POLICY "Service role bot_automod_rules" ON public.bot_automod_rules FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bot_automod_heat" ON public.bot_automod_heat FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bot_reaction_roles" ON public.bot_reaction_roles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bot_custom_commands" ON public.bot_custom_commands FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bot_giveaways" ON public.bot_giveaways FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bot_starboard_config" ON public.bot_starboard_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bot_starboard_entries" ON public.bot_starboard_entries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bot_suggestions" ON public.bot_suggestions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bot_suggestions_config" ON public.bot_suggestions_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bot_verification_config" ON public.bot_verification_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bot_join_gate_config" ON public.bot_join_gate_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bot_scheduled_messages" ON public.bot_scheduled_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bot_auto_roles" ON public.bot_auto_roles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bot_mod_log_config" ON public.bot_mod_log_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bot_join_leave_config" ON public.bot_join_leave_config FOR ALL TO service_role USING (true) WITH CHECK (true);
