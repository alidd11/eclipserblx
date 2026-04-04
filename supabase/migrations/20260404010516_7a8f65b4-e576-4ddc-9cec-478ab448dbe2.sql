
-- Product-related
DELETE FROM product_translations WHERE product_id = '45cfb409-bea6-4fd2-8fce-773bf9d6d8b7';
DELETE FROM product_promotions WHERE product_id = '45cfb409-bea6-4fd2-8fce-773bf9d6d8b7';
DELETE FROM wishlist WHERE product_id = '45cfb409-bea6-4fd2-8fce-773bf9d6d8b7';
DELETE FROM download_logs WHERE product_id = '45cfb409-bea6-4fd2-8fce-773bf9d6d8b7';
DELETE FROM download_tokens WHERE product_id = '45cfb409-bea6-4fd2-8fce-773bf9d6d8b7';
DELETE FROM creator_ip_registry WHERE store_id = 'de72b93c-7c05-4162-ba19-cd01a1678ccf';
DELETE FROM products WHERE store_id = 'de72b93c-7c05-4162-ba19-cd01a1678ccf';

-- Store-related
DELETE FROM store_follows WHERE store_id = 'de72b93c-7c05-4162-ba19-cd01a1678ccf';
DELETE FROM store_pages WHERE store_id = 'de72b93c-7c05-4162-ba19-cd01a1678ccf';
DELETE FROM store_custom_sections WHERE store_id = 'de72b93c-7c05-4162-ba19-cd01a1678ccf';
DELETE FROM store_domains WHERE store_id = 'de72b93c-7c05-4162-ba19-cd01a1678ccf';
DELETE FROM store_nav_links WHERE store_id = 'de72b93c-7c05-4162-ba19-cd01a1678ccf';
DELETE FROM store_team_invites WHERE store_id = 'de72b93c-7c05-4162-ba19-cd01a1678ccf';
DELETE FROM store_team_members WHERE store_id = 'de72b93c-7c05-4162-ba19-cd01a1678ccf';
DELETE FROM store_credentials WHERE store_id = 'de72b93c-7c05-4162-ba19-cd01a1678ccf';
DELETE FROM store_payment_details WHERE store_id = 'de72b93c-7c05-4162-ba19-cd01a1678ccf';
DELETE FROM seller_balances WHERE store_id = 'de72b93c-7c05-4162-ba19-cd01a1678ccf';
DELETE FROM seller_analytics WHERE store_id = 'de72b93c-7c05-4162-ba19-cd01a1678ccf';
DELETE FROM seller_security_scores WHERE store_id = 'de72b93c-7c05-4162-ba19-cd01a1678ccf';
DELETE FROM discord_role_configs WHERE store_id = 'de72b93c-7c05-4162-ba19-cd01a1678ccf';

-- Finally delete the store
DELETE FROM stores WHERE id = 'de72b93c-7c05-4162-ba19-cd01a1678ccf';
