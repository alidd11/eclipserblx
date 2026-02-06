-- Performance indexes for frequently filtered columns
-- These indexes significantly speed up pagination, filtering, and sorting queries

-- Orders table indexes (for admin orders, seller orders, customer purchases)
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON public.orders(status, created_at DESC);

-- Products table indexes (for product listings, search, filtering)
CREATE INDEX IF NOT EXISTS idx_products_store_id_active ON public.products(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_category_active ON public.products(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured) WHERE is_featured = true;

-- Seller transactions indexes (for seller dashboard)
CREATE INDEX IF NOT EXISTS idx_seller_transactions_store_created ON public.seller_transactions(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_transactions_type ON public.seller_transactions(type);
CREATE INDEX IF NOT EXISTS idx_seller_transactions_status ON public.seller_transactions(status);

-- Reviews indexes (for product pages, seller reviews)
CREATE INDEX IF NOT EXISTS idx_reviews_product_approved ON public.reviews(product_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);

-- Wishlist indexes (for customer wishlist)
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON public.wishlist(user_id);

-- Order items indexes (for order details, seller analytics)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Forum indexes (for forum pages)
CREATE INDEX IF NOT EXISTS idx_forum_threads_category ON public.forum_threads(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_thread ON public.forum_posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user ON public.forum_posts(user_id);

-- User profiles indexes (for admin user management)
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Stores indexes
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON public.stores(is_active);
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON public.stores(owner_id);