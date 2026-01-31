
# Plan: Add "Manage my Account" Button Like Parcel Bot

## Overview
Configure the `/profile` command to display a proper Discord button below the embed, matching the Parcel bot's clean button style with an external link icon.

## How Discord Buttons Work with BotGhost

Discord buttons cannot be created purely from API responses - they must be configured in BotGhost's command builder. The API provides the data (URLs, labels), and BotGhost's "Button" action uses that data to create the actual button component.

## Implementation

### 1. Update Edge Function Response

Add a dedicated `button_url` field to make it easy for BotGhost to reference:

**File: `supabase/functions/botghost-customer-api/index.ts`**

```typescript
return jsonResponse({
  success: true,
  roblox_thumbnail_url: robloxThumbnailUrl,
  
  // New: Explicit button configuration for BotGhost
  button_url: "https://eclipserblx.com/account",
  button_label: "Manage my Account",
  
  embed: { ... },
  // ...existing fields
});
```

### 2. BotGhost Configuration Steps

In BotGhost's command builder for `/profile`:

1. **Add a Button Action** after the embed response:
   - Type: **Link Button**
   - Label: `Manage my Account`
   - URL: `{profile.response.button_url}` (or hardcode `https://eclipserblx.com/account`)
   - Emoji: Use the external link emoji or leave blank

2. The button will appear below the embed just like in the Parcel reference

### 3. Update Admin Reference Documentation

Update `BotGhostCommandReference.tsx` to include instructions for adding the button:

```typescript
{
  name: "/profile",
  description: "View linked account profile",
  action: "profile",
  jsonBody: `{
  "action": "profile",
  "discord_id": "{User.id}",
  "discord_username": "{User.username}"
}`,
  responseVariable: "{profile.response.message}",
  notes: "Add a Link Button action after the embed. Set URL to: https://eclipserblx.com/account and Label to: Manage my Account",
}
```

## Visual Result

```text
+----------------------------------+
| Profile of alidd1          [IMG] |
|                                  |
| Roblox                           |
| Alii_DD1                         |
| `4261672558`                     |
|                                  |
| Discord                          |
| alidd1                           |
| `1098631267563610292`            |
|                                  |
| Purchased Products               |
| none                             |
+----------------------------------+

[Manage my Account ↗]  <-- Button below embed
```

## Technical Notes

| Component | Source |
|-----------|--------|
| Embed content | API response |
| Thumbnail | API `roblox_thumbnail_url` field |
| Button | BotGhost native Link Button action |
| Button URL | API `button_url` field or hardcoded |

## Files to Modify

1. **`supabase/functions/botghost-customer-api/index.ts`** - Add `button_url` and `button_label` fields to profile response
2. **`src/components/admin/BotGhostCommandReference.tsx`** - Add note about configuring the Link Button in BotGhost
