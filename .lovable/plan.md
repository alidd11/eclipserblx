

## Diagnosis

The og-proxy edge function works **perfectly** — it returns correct product-specific OG tags with the right image, title, and description. I confirmed this by invoking it directly.

The Cloudflare Worker is also deployed with correct routes (`eclipserblx.com/*`, `www.eclipserblx.com/*`, `*.eclipserblx.com/*`). DNS is proxied through Cloudflare (confirmed via DNS resolution).

**The problem**: The Worker is NOT intercepting requests. Most likely cause: **Cloudflare's Super Bot Fight Mode** (mentioned in your infrastructure notes) is intercepting bot User-Agents (like Discordbot) BEFORE the Worker gets a chance to run. This means Discord gets challenged or served a different response, falls back to fetching the raw page, and sees the default OG tags from `index.html`.

Evidence: Even the `/share/` path (which should proxy for ALL user agents, not just bots) returns the SPA HTML instead of the og-proxy response, confirming the Worker isn't executing at all.

## Solution: Two-Pronged Fix

### 1. Cloudflare WAF Skip Rule for Social Media Bots
Update `deploy-cloudflare-worker` to create a **WAF Custom Rule** via the Cloudflare API that skips Bot Fight Mode and security challenges for known social media crawler User-Agents (Discordbot, Twitterbot, facebookexternalhit, etc.). This runs at the firewall level and lets the Worker handle these requests.

### 2. Cloudflare Redirect Rule as Bulletproof Fallback
Add a **Cloudflare Single Redirect Rule** via the Rulesets API that rewrites `/share/*` requests to the og-proxy edge function URL directly. Single Redirect Rules execute at a higher priority than Workers, Bot Fight Mode, and most other features — making them immune to interference.

```text
Request:  eclipserblx.com/share/products/battle-of-ypres-1917
   ↓ (Redirect Rule — highest priority)
Rewrite:  supabase.co/functions/v1/og-proxy?path=/products/battle-of-ypres-1917
   ↓
Response: HTML with correct OG tags + meta-refresh redirect to real page
```

### Technical Changes

**File: `supabase/functions/deploy-cloudflare-worker/index.ts`**
- Add Step 4: Create/update a **WAF Custom Rule** via `PUT /zones/{zone}/rulesets/{ruleset}` that uses expression `(http.user_agent contains "Discordbot") or (http.user_agent contains "Twitterbot") or ...` with action `skip` to bypass Bot Fight Mode
- Add Step 5: Create/update a **Redirect Rule** via `PUT /zones/{zone}/rulesets/phases/http_request_dynamic_redirect/entrypoint` that redirects `/share/*` to the og-proxy edge function URL
- Return results of both new steps in the response

**File: `docs/cloudflare-worker-og.js`**
- Update reference documentation to reflect new WAF rule and redirect rule

### Why This Is Permanent
- The WAF skip rule ensures social bots ALWAYS reach the Worker
- The redirect rule for `/share/` works independently of the Worker entirely
- Both are managed via the Cloudflare API in the same deploy function, so they stay in sync
- No manual Cloudflare dashboard changes needed

