
-- Bot moderation action log
CREATE TABLE IF NOT EXISTS public.bot_mod_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT,
  action_type TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  target_username TEXT,
  moderator_id TEXT NOT NULL,
  moderator_username TEXT,
  reason TEXT,
  duration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bot AFK status
CREATE TABLE IF NOT EXISTS public.bot_afk_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  user_discord_id TEXT NOT NULL,
  reason TEXT DEFAULT 'AFK',
  afk_since TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(guild_id, user_discord_id)
);

-- Bot command usage tracking
CREATE TABLE IF NOT EXISTS public.bot_command_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT,
  command_name TEXT NOT NULL,
  user_discord_id TEXT,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Internal notes for admin/staff
CREATE TABLE IF NOT EXISTS public.internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'normal',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Internal note attachments
CREATE TABLE IF NOT EXISTS public.internal_note_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES public.internal_notes(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bot_mod_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_afk_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_command_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_note_attachments ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can manage bot_mod_actions" ON public.bot_mod_actions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage bot_afk_status" ON public.bot_afk_status FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage bot_command_usage" ON public.bot_command_usage FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage internal_notes" ON public.internal_notes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage internal_note_attachments" ON public.internal_note_attachments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role for bot operations
CREATE POLICY "Service role bot_mod_actions" ON public.bot_mod_actions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bot_afk_status" ON public.bot_afk_status FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bot_command_usage" ON public.bot_command_usage FOR ALL TO service_role USING (true) WITH CHECK (true);
