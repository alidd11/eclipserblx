

# Remove Decorative Icons — Enterprise Cleanup

## Problem
Multiple pages still use decorative icons in section headings, hero areas, and benefit cards. Enterprise companies like Stripe, Linear, and Vercel don't use these — they rely on typography and whitespace.

## Pages & Changes

### 1. `src/pages/DMCA.tsx`
- Remove the large centered Shield icon in the hero (lines 15-18)
- Remove icons from all section heading bars (`FileText`, `AlertTriangle`, `Mail`, `Clock`, `XCircle`, `AlertTriangle`) — keep heading text only
- Left-align the header like other enterprise pages (`text-2xl font-display font-bold`)
- Clean up unused icon imports

### 2. `src/pages/Jobs.tsx`
- Remove icons from the "Why Work With Us?" benefit cards (`Clock`, `CheckCircle`, `AlertCircle`) — keep title + description only
- Keep small inline metadata icons (`Briefcase`, `MapPin`) in job listings as those are functional, not decorative
- Keep `Loader2` and `Send` as they are functional (spinner, button)
- Clean up unused imports

### 3. `src/pages/FreeAssets.tsx`
- Remove `Gift` icon from the page heading (line 72)
- Clean up unused import

### 4. `src/pages/RecoverOrder.tsx`
- Remove `Package` icon from the section heading bars (lines 84, 119)
- Clean up unused import

### 5. `src/pages/NotificationPreferences.tsx`
- Remove `Bell` icons from section heading bars (lines 205, 248)
- Keep icons next to individual toggle items (Package, Tag, MessageCircle, Headphones) as those are functional list-item identifiers, not decorative headings

### 6. `src/pages/Affiliate.tsx`
- Remove large icon circles from benefit cards (line 58) — flatten to text-only layout

## What stays
- Loading spinners (`Loader2`) — functional
- Button icons (`Send`) — functional
- Small inline metadata (job type/location icons) — functional
- Category page icons — functional navigation aids
- Toggle-list item icons (notification prefs) — functional identifiers

