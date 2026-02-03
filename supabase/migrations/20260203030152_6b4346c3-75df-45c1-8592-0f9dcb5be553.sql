-- Update the public settings RLS policy to include new subscription ID keys
DROP POLICY IF EXISTS "Public can read public settings" ON public.settings;

CREATE POLICY "Public can read public settings" 
ON public.settings 
FOR SELECT 
USING (key IN (
  'discord_widget_server_id',
  'discord_invite_url',
  'store_name',
  'roblox_game_url',
  'affiliate_commission_rate',
  'affiliate_minimum_payout',
  'affiliate_program_enabled',
  'marketplace_public',
  'seller_min_account_age_days',
  'seller_min_purchases_required',
  'seller_require_group_membership',
  'seller_require_badge_ownership',
  'roblox_group_id',
  'roblox_required_badges',
  'robux_ad_basic_robux_price',
  'robux_ad_pro_robux_price',
  'robux_ad_premium_robux_price',
  'robux_ad_basic_subscription_id',
  'robux_ad_pro_subscription_id',
  'robux_ad_premium_subscription_id'
));