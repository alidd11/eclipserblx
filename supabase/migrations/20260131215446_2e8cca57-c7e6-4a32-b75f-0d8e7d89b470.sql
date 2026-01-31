
-- Drop the existing policies and recreate with expanded key list
DROP POLICY IF EXISTS "Allow public read for specific keys" ON public.settings;
DROP POLICY IF EXISTS "Public can read public site settings" ON public.settings;

-- Create a single comprehensive public read policy for settings
CREATE POLICY "Public can read public settings"
  ON public.settings
  FOR SELECT
  USING (
    key = ANY (ARRAY[
      -- Site configuration
      'discord_widget_server_id',
      'discord_invite_url',
      'store_name',
      'roblox_game_url',
      -- Affiliate settings
      'affiliate_commission_rate',
      'affiliate_minimum_payout',
      'affiliate_program_enabled',
      -- Marketplace settings
      'marketplace_public',
      -- Seller verification settings (needed for seller application form)
      'seller_min_account_age_days',
      'seller_min_purchases_required',
      'seller_require_group_membership',
      'seller_require_badge_ownership',
      'roblox_group_id',
      'roblox_required_badges'
    ]::text[])
  );
