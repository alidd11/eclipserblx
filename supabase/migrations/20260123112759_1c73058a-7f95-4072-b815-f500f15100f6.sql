-- Drop existing public read policy and recreate with marketplace_public included
DROP POLICY IF EXISTS "Allow public read for specific keys" ON public.settings;

CREATE POLICY "Allow public read for specific keys" ON public.settings
  FOR SELECT
  USING (
    key IN (
      'discord_widget_server_id',
      'discord_invite_url', 
      'store_name',
      'roblox_game_url',
      'affiliate_commission_rate',
      'affiliate_minimum_payout',
      'affiliate_program_enabled',
      'marketplace_public'
    )
  );