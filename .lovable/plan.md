
# Plan: Generate Vino Store Logo and Banner

## Overview
Create visually appealing branding assets for the Vino Store using AI image generation, then upload them to the store's branding storage.

## Store Context
- **Name**: Vino
- **Theme**: Premium Roblox assets marketplace
- **Accent Color**: #8b5cf6 (purple/violet)
- **Vibe**: Premium, professional, modern gaming aesthetic

## Design Direction

### Logo (200x200px)
A clean, modern logo featuring:
- A stylized "V" lettermark or wine glass motif (playing on "Vino" = wine)
- Purple/violet gradient tones matching the accent color (#8b5cf6)
- Minimalist, premium aesthetic suitable for dark and light backgrounds
- Gaming-inspired but sophisticated feel

### Banner (1200x400px)
A wide banner featuring:
- Abstract geometric or fluid gradient background in purple/violet tones
- Subtle tech/gaming elements (code patterns, pixel accents, or grid lines)
- Premium, luxurious feel with depth and dimension
- No text (clean design that works with overlaid store name)

## Technical Implementation

### Step 1: Create Edge Function for AI Image Generation
Create a new edge function `generate-store-branding` that:
- Uses the Lovable AI gateway with `google/gemini-2.5-flash-image` model
- Generates images based on specific prompts for logo and banner
- Returns the generated images as base64

### Step 2: Create Admin UI Component
Build a simple admin action button that:
- Calls the edge function to generate images
- Converts base64 to File objects
- Uploads to `store-branding` storage bucket
- Updates the store record with new URLs

### Step 3: Update Store Record
After successful upload:
- Update the `stores` table with new `logo_url` and `banner_url`

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/generate-store-branding/index.ts` | Create | Edge function for AI image generation |
| `src/components/admin/GenerateStoreBranding.tsx` | Create | Admin UI to trigger generation |
| `src/pages/admin/StoresAdmin.tsx` | Modify | Add generate branding button for admin stores |

## Technical Details

### Edge Function Structure
```text
generate-store-branding/
  index.ts - Main handler calling Lovable AI gateway
```

### AI Prompts
**Logo prompt**: "Minimalist premium logo design, stylized letter V with wine glass silhouette integration, purple violet gradient (#8b5cf6), modern gaming aesthetic, clean vector style, dark background, professional brand mark, 200x200 square format"

**Banner prompt**: "Wide banner design 1200x400, abstract flowing purple violet gradient background (#8b5cf6), subtle geometric patterns, premium luxurious feel, modern tech aesthetic, no text, dark theme, suitable for gaming marketplace header"

### Storage Flow
1. Generate image via AI
2. Convert base64 to Blob
3. Upload to `store-branding/{store_id}/logo.png` and `banner.png`
4. Get public URLs
5. Update store record

## Security Considerations
- Edge function should verify admin authentication
- Rate limit generation requests
- Validate store ID exists before processing
