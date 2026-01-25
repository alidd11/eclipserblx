-- Add columns to track Discord webhook references for products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS discord_thread_id TEXT,
ADD COLUMN IF NOT EXISTS discord_message_id TEXT;