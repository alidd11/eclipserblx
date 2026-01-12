-- Add column to store Discord member count
ALTER TABLE public.bot_installation_codes 
ADD COLUMN IF NOT EXISTS discord_member_count integer;