
-- Remove sensitive staff-only tables from realtime publication
-- Using DROP TABLE without IF EXISTS (they exist per our check)
ALTER PUBLICATION supabase_realtime DROP TABLE public.staff_chat_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.staff_chat_reactions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.staff_message_reads;
ALTER PUBLICATION supabase_realtime DROP TABLE public.staff_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.staff_activity;
ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_chat_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_chat_reactions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.contact_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.contact_message_replies;
ALTER PUBLICATION supabase_realtime DROP TABLE public.store_applications;
ALTER PUBLICATION supabase_realtime DROP TABLE public.seller_analytics;
ALTER PUBLICATION supabase_realtime DROP TABLE public.discord_modmail_tickets;
ALTER PUBLICATION supabase_realtime DROP TABLE public.discord_modmail_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.seller_document_notifications;
ALTER PUBLICATION supabase_realtime DROP TABLE public.page_visits;
