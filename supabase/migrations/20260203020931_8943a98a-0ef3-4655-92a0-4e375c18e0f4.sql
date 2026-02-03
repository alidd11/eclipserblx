-- Add tier-specific Robux gamepass settings for advertisements
INSERT INTO public.settings (key, value)
VALUES 
  ('robux_ad_basic_gamepass_id', '"89295137987482"'),
  ('robux_ad_basic_robux_price', '0'),
  ('robux_ad_pro_gamepass_id', '"78529316701367"'),
  ('robux_ad_pro_robux_price', '0'),
  ('robux_ad_premium_gamepass_id', '"100489119319359"'),
  ('robux_ad_premium_robux_price', '0')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;