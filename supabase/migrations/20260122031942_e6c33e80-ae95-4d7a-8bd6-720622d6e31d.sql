-- Add seller verification settings
INSERT INTO settings (key, value) VALUES 
  ('seller_min_account_age_days', '7'),
  ('seller_min_purchases_required', '0'),
  ('seller_require_group_membership', 'true'),
  ('seller_require_badge_ownership', 'false')
ON CONFLICT (key) DO NOTHING;

-- Add verification_results column to store_applications
ALTER TABLE store_applications ADD COLUMN IF NOT EXISTS verification_results jsonb DEFAULT '{}';