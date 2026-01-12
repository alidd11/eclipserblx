-- Add processed_by field to track which staff member handled the bot request
ALTER TABLE public.bot_installation_codes
ADD COLUMN IF NOT EXISTS processed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS processed_at timestamp with time zone;