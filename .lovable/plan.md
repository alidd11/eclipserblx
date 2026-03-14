

# Fix OG Embeds for Product Links in Discord

## Problem
The `eclipse-og-proxy` Cloudflare Worker is not intercepting traffic. Both Discord's bot and human browsers receive the raw SPA `index.html` with generic OG tags instead of product-specific metadata. This means when someone shares `eclipserblx.com/products/13` in Discord, they see a generic Eclipse embed rather than the product name, image, and price.

**Test evidence:**
- `xWorker: null` on both bot and human requests
- Both get identical SPA HTML — no product-specific OG tags
- The worker routes were likely removed by a previous emergency fix

## Solution

**Redeploy the Cloudflare Worker** by invoking the existing `deploy-cloudflare-worker` edge function. This single call will:

1. **Upload the worker script** (`eclipse-og-proxy`) — detects Discord/Twitter/Facebook bots and routes them to the `og-proxy` edge function which returns product-specific HTML with OG meta tags
2. **Create worker routes** for `eclipserblx.com/*`, `www.eclipserblx.com/*`, `*.eclipserblx.com/*`
3. **Add a WAF skip rule** so social crawlers (Discordbot, Twitterbot, etc.) bypass Super Bot Fight Mode
4. **Configure SBFM** to allow definitely-automated and verified bots (this is safe — the WAF managed rulesets still block malicious traffic)
5. **Set up redirect rules** as backup bot detection at the Cloudflare Rules level

## Security Impact

Allowing verified bots (Google, Discord, etc.) through SBFM is **standard practice** and does not reduce security:
- WAF managed rulesets (SQLi, XSS, OWASP) remain fully active
- Rate limiting on API paths stays in place
- Only known social crawlers are whitelisted via the WAF skip rule
- The worker itself validates routes and returns 404/410 for invalid paths

## Steps

1. Call `deploy-cloudflare-worker` to redeploy everything
2. Call `test-worker-bot` to verify Discord bot now receives OG HTML with `xWorker: "og-served"` and `hasOg: true` with product-specific content

No code changes needed — the existing functions handle everything.

