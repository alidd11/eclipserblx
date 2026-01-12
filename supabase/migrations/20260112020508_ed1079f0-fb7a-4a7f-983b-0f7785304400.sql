-- Add columns to store Discord server info
ALTER TABLE public.bot_installation_codes 
ADD COLUMN IF NOT EXISTS discord_guild_name text,
ADD COLUMN IF NOT EXISTS discord_guild_icon text;