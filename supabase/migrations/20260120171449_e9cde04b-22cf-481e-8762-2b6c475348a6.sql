-- Add Discord webhook URL column for seller order notifications
ALTER TABLE stores ADD COLUMN IF NOT EXISTS discord_webhook_url text;