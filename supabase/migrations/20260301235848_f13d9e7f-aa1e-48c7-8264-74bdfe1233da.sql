-- Add indexes on frequently queried columns for better performance

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders (customer_email);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products (store_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_active_featured ON public.products (is_active, is_featured) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_download_count ON public.products (download_count DESC) WHERE is_active = true;

-- Order Items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items (product_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews (user_id);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_status ON public.subscriptions (user_id, status);

-- User roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);

-- Seller transactions
CREATE INDEX IF NOT EXISTS idx_seller_transactions_store_id ON public.seller_transactions (store_id);
CREATE INDEX IF NOT EXISTS idx_seller_transactions_order_id ON public.seller_transactions (order_id);

-- Stores
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores (slug);
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON public.stores (owner_id);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);

-- Wishlist
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON public.wishlist (user_id);

-- Download logs
CREATE INDEX IF NOT EXISTS idx_download_logs_user_product ON public.download_logs (user_id, product_id);