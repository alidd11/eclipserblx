

# Discord Link Embeds — Audit & Enterprise Improvements

## Current State

Your Discord embed system is **fully functional** and well-architected:

1. **Cloudflare Worker** (`docs/cloudflare-worker-og.js`) intercepts bot user agents (Discordbot, Twitterbot, etc.) and routes them to the `og-proxy` edge function
2. **`og-proxy` edge function** renders server-side HTML with full Open Graph tags for products, stores, categories, and static pages
3. **WAF rule** bypasses Bot Fight Mode so crawlers aren't blocked
4. **`/share/` prefix** serves OG tags unconditionally (no user-agent sniffing needed — useful as a fallback)

When someone pastes `eclipserblx.com/products/12345` in Discord, it already shows the product name, description, price, store name, and product image as a rich embed.

## What Can Be Enterprised

Despite the solid foundation, there are **5 improvements** to make the embeds look more polished and branded:

### 1. Add `theme-color` meta tag to OG responses
Discord uses `<meta name="theme-color">` to color the left sidebar stripe on embeds. Currently missing from `og-proxy` — embeds show Discord's default grey. Adding Eclipse's brand purple (`#7c3aed`) makes every shared link instantly recognizable.

### 2. Add oEmbed discovery for richer Discord embeds
Discord supports oEmbed, which allows a custom provider name and author line in embeds. Adding a `<link rel="alternate" type="application/json+oembed">` tag lets Discord show "Eclipse Marketplace" as the provider with a link, rather than just the domain.

### 3. Improve product embed descriptions
Currently, product descriptions are raw-stripped HTML truncated to 200 chars. Improve by: cleaning up whitespace/entities after stripping tags, and appending price + store info in a structured format (e.g. "£4.99 · By StudioName · 127 reviews").

### 4. Add `og:image:alt` for accessibility
Missing from all responses. Discord and Twitter use this for screen readers. Simple addition of `<meta property="og:image:alt" content="Product Name preview image">`.

### 5. Enterprise the share buttons
The current `SocialShareButtons` component uses `/products/X` paths. Using the `/share/products/X` prefix would guarantee OG tags work even if the Cloudflare Worker has issues — a more resilient approach.

## Technical Details

### Files to modify

**`supabase/functions/og-proxy/index.ts`** — `buildHtml()` function:
- Add `<meta name="theme-color" content="#7c3aed"/>` to the head
- Add `<meta property="og:image:alt" content="${esc(t)}"/>` after og:image
- Add oEmbed discovery link pointing to a JSON endpoint
- Improve description formatting in product handlers

**`supabase/functions/og-proxy/index.ts`** — Add oEmbed JSON handler:
- When `?format=oembed` is passed, return JSON instead of HTML
- Include `provider_name`, `provider_url`, `author_name` (store name)

**`src/components/product/SocialShareButtons.tsx`**:
- Use `/share/` prefix for shared URLs to guarantee embed reliability

**`supabase/functions/product-og/index.ts`**:
- Add matching `theme-color` and `og:image:alt` tags for consistency

### No database changes required

