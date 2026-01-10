-- HIGH PRIORITY: Profiles (15,292 seq scans)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- HIGH PRIORITY: Products (8,965 seq scans)
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);

-- HIGH PRIORITY: Reviews (3,384 seq scans, 41 rows/scan average)
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON public.reviews(is_approved) WHERE is_approved = true;

-- HIGH PRIORITY: Staff Messages (1,936 seq scans, 125 rows/scan!)
CREATE INDEX IF NOT EXISTS idx_staff_messages_sender_id ON public.staff_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_staff_messages_recipient_id ON public.staff_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_staff_messages_created_at ON public.staff_messages(created_at DESC);

-- HIGH PRIORITY: Chat Conversations (4,705 seq scans)
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_assigned_to ON public.chat_conversations(assigned_to);

-- HIGH PRIORITY: Orders (5,798 seq scans)
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- MEDIUM PRIORITY: Chat Messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);

-- MEDIUM PRIORITY: Order Items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- MEDIUM PRIORITY: Staff Activity
CREATE INDEX IF NOT EXISTS idx_staff_activity_user_id ON public.staff_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_activity_created_at ON public.staff_activity(created_at DESC);

-- MEDIUM PRIORITY: Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- LOWER PRIORITY: Forum tables (for future growth)
CREATE INDEX IF NOT EXISTS idx_forum_threads_user_id ON public.forum_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_category_id ON public.forum_threads(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id ON public.forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_thread_id ON public.forum_posts(thread_id);

-- LOWER PRIORITY: Support
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);