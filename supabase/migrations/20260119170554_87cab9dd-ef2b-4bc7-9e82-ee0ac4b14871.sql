-- Drop and recreate the public read policy to include affiliate settings
DROP POLICY IF EXISTS "Public can read public site settings" ON public.settings;

CREATE POLICY "Public can read public site settings"
ON public.settings
FOR SELECT
USING (
  key = ANY (ARRAY[
    'discord_widget_server_id'::text, 
    'discord_invite_url'::text, 
    'store_name'::text, 
    'roblox_game_url'::text,
    'affiliate_commission_rate'::text,
    'affiliate_minimum_payout'::text,
    'affiliate_program_enabled'::text
  ])
);