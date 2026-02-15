

# Nitro Boost Discord Logging

## Overview
Create a new edge function `send-boost-log` that sends a celebratory embed to channel `1461353041310781531` when someone boosts the server. No total boost count or tier stats will be included -- just a clean notification about the user who boosted.

## Embed Design
- **Boosted**: Pink/Magenta (`0xFF73FA`) embed with rocket emoji and celebration message
- **Unboosted**: Grey (`0x808080`) embed with a simple departure message
- **Fields**: User mention, User ID, Action only -- no boost count or tier info

## Technical Details

### New file: `supabase/functions/send-boost-log/index.ts`
- Reuses `sendBotMessage` from `_shared/discord-bot.ts`
- Accepts: `discord_id`, `discord_username`, `discord_avatar_url`, `action` (boosted/unboosted)
- Hardcoded channel: `1461353041310781531`
- Embed includes author (username + avatar), description with user mention, and minimal fields (User ID, Action)

### After deployment
- A test embed will be sent to verify formatting

