-- Allow the public (including signed-out visitors) to read specific non-sensitive site settings
-- This is needed for homepage embeds like the Discord widget.

CREATE POLICY "Public can read public site settings"
ON public.settings
FOR SELECT
USING (
  key IN (
    'discord_widget_server_id',
    'discord_invite_url',
    'store_name',
    'roblox_game_url'
  )
);
