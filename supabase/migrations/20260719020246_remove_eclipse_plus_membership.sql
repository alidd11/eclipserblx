-- Eclipse+ customer membership has been fully retired (no active subscribers).
-- This removes all schema tied exclusively to that feature.
-- Seller Pro (seller_subscriptions, subscription_tier/billing_period usage on that
-- table's own enum-free columns, create-subscription/customer-portal) is untouched.

-- Drop child tables first (FK dependents)
DROP TABLE IF EXISTS promotion_claims;
DROP TABLE IF EXISTS promotions;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS subscription_tiers;

-- Drop now-orphaned enums (were only used by the tables above)
DROP TYPE IF EXISTS subscription_tier;
DROP TYPE IF EXISTS subscription_billing_period;

-- Drop Eclipse+-only columns on tables that remain
ALTER TABLE stores DROP COLUMN IF EXISTS eclipse_plus_discount_enabled;
ALTER TABLE credit_balances DROP COLUMN IF EXISTS eclipse_plus_bonus_claimed;
ALTER TABLE products DROP COLUMN IF EXISTS eclipse_free_eligible;
ALTER TABLE discord_role_configs DROP COLUMN IF EXISTS requires_subscription;

-- Remove the now-meaningless role from any users who held it
DELETE FROM user_roles WHERE role = 'eclipse_plus_member';
