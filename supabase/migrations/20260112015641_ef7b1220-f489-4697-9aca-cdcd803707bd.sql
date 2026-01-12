-- Add discord_invite column to bot_installation_codes table
ALTER TABLE bot_installation_codes 
ADD COLUMN IF NOT EXISTS discord_invite text;