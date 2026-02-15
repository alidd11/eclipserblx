

## Prevent Competitor Marketplace Links in Product Descriptions

### What This Does
Automatically strips links to competing Roblox asset marketplaces (ClearlyDev, BuiltByBit, ScriptBlox, etc.) from product descriptions -- both when sellers write them and when products are imported from external sources. Sellers will see a toast notification if blocked links are detected.

### How It Works

**1. Create a link-filtering utility (`src/lib/blockedLinks.ts`)**
- Define a blocklist of competitor marketplace domains (e.g. `clearlydev.com`, `builtbybit.com`, `scriptblox.com`, `roblox-scripts.com`, etc.)
- Export a `stripBlockedLinks(html)` function that removes `<a>` tags pointing to blocked domains
- Export a `containsBlockedLinks(text)` function that checks raw text/HTML for blocked URLs (for showing warnings)
- The blocklist will be easy to extend in one place

**2. Integrate into the sanitization pipeline (`src/lib/sanitize.ts`)**
- Call `stripBlockedLinks()` inside `sanitizeHtml()` after DOMPurify runs, so blocked links are silently removed from all rendered descriptions (product detail pages, admin views, store pages)

**3. Warn sellers on save (`src/pages/seller/SellerProductEditor.tsx`)**
- Before submitting, check the description with `containsBlockedLinks()`
- If detected, show a toast warning: "Links to external marketplaces are not allowed and have been removed"
- Still allow the save (the links get stripped by sanitization), but the seller is informed

**4. Strip during external imports (`supabase/functions/import-external-products/index.ts`)**
- After scraping product descriptions from ClearlyDev/BuiltByBit, strip any self-referential marketplace links before storing in the database

### Blocked Domains (Initial List)
- `clearlydev.com`
- `builtbybit.com`
- `scriptblox.com`
- `v3rmillion.net`
- `robloxscripts.com`
- Additional domains can be added to the array at any time

### Technical Details

**New file:** `src/lib/blockedLinks.ts`
```typescript
const BLOCKED_DOMAINS = [
  'clearlydev.com',
  'builtbybit.com',
  'scriptblox.com',
  'v3rmillion.net',
  'robloxscripts.com',
];

// Strips <a> tags with blocked hrefs
export function stripBlockedLinks(html: string): string { ... }

// Checks raw text for blocked URLs (for validation warnings)
export function containsBlockedLinks(text: string): boolean { ... }
```

**Modified files:**
- `src/lib/sanitize.ts` -- call `stripBlockedLinks` after DOMPurify
- `src/pages/seller/SellerProductEditor.tsx` -- add warning toast on save
- `supabase/functions/import-external-products/index.ts` -- strip blocked links from imported descriptions

