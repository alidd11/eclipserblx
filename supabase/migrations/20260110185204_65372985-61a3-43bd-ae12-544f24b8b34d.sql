-- Add sender_type column to contact_message_replies to distinguish staff vs customer replies
ALTER TABLE public.contact_message_replies 
ADD COLUMN IF NOT EXISTS sender_type TEXT NOT NULL DEFAULT 'staff';

-- Add email_message_id column to track Resend message IDs for threading
ALTER TABLE public.contact_message_replies 
ADD COLUMN IF NOT EXISTS email_message_id TEXT;

-- Add email_message_id to contact_messages for initial message threading
ALTER TABLE public.contact_messages 
ADD COLUMN IF NOT EXISTS email_thread_id TEXT;

-- Update RLS to allow the webhook (service role) to insert customer replies
-- The existing policies already allow staff to view, and service role bypasses RLS