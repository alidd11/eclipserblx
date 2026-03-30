
-- Fix 2: Remove sensitive tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE affiliate_balances;
ALTER PUBLICATION supabase_realtime DROP TABLE affiliate_commissions;
ALTER PUBLICATION supabase_realtime DROP TABLE affiliate_payouts;
ALTER PUBLICATION supabase_realtime DROP TABLE seller_transactions;
ALTER PUBLICATION supabase_realtime DROP TABLE subscriptions;
ALTER PUBLICATION supabase_realtime DROP TABLE robux_transactions;
ALTER PUBLICATION supabase_realtime DROP TABLE ip_shield_contact_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE stores;
ALTER PUBLICATION supabase_realtime DROP TABLE advertisement_clicks;
ALTER PUBLICATION supabase_realtime DROP TABLE discord_xp;
