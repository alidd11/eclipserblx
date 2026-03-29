-- Bot settings key-value store
CREATE TABLE public.bot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read bot_settings" ON public.bot_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage bot_settings" ON public.bot_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bot command settings
CREATE TABLE public.bot_command_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_name text UNIQUE NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_command_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read bot_command_settings" ON public.bot_command_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage bot_command_settings" ON public.bot_command_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default bot settings
INSERT INTO public.bot_settings (key, value, description) VALUES
  ('bot_host_url', '', 'URL where the bot is hosted (e.g. https://my-bot.fly.dev)'),
  ('main_guild_id', '', 'Main Discord server ID'),
  ('customer_role_id', '', 'Discord role ID for customers'),
  ('loyal_customer_role_id', '', 'Discord role ID for loyal customers'),
  ('eclipse_plus_role_id', '', 'Discord role ID for Eclipse+ members'),
  ('store_creator_role_id', '', 'Discord role ID for store creators'),
  ('verified_seller_role_id', '', 'Discord role ID for verified sellers'),
  ('support_webhook_url', '', 'Discord webhook URL for support notifications'),
  ('site_url', '', 'Main website URL');

-- Seed default command settings
INSERT INTO public.bot_command_settings (command_name, description) VALUES
  ('link', 'Link Discord account to website account'),
  ('verify', 'Verify a link code'),
  ('profile', 'View your account profile'),
  ('unlink', 'Unlink Discord from website account'),
  ('purchases', 'View your purchases'),
  ('retrieve', 'Download a purchased product'),
  ('store', 'View store information'),
  ('showcase', 'Showcase a store or product'),
  ('walletbalance', 'Check your wallet balance'),
  ('getrole', 'Sync your Discord roles'),
  ('update', 'Admin: sync roles for a user'),
  ('help', 'View all bot commands'),
  ('globalban', 'Global Guard: ban a user'),
  ('globalunban', 'Global Guard: unban a user'),
  ('globalbans', 'Global Guard: list bans');