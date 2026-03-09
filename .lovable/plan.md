

# Cloudflare Pro Upgrade — Full Optimization Plan

Once you upgrade to Cloudflare Pro ($20/month), here's everything we can implement to maximize performance, security, and SEO for Eclipse.

---

## What Pro Unlocks (vs Free)

| Feature | Free | Pro |
|---------|------|-----|
| **Polish** (auto image compression) | No | Yes |
| **Super Bot Fight Mode** | Basic | Full control |
| **WAF Managed Rulesets** | Limited (5 custom rules) | More custom rules + OWASP |
| **Cache Rules** | 10 | 25 |
| **Redirect Rules** | 10 | 25 |
| **Transform Rules** | 10 | 25 |
| **Pro-only WAF rulesets** | No | Yes |
| **Image optimization (Polish)** | No | Lossy/Lossless/WebP |
| **Crawler Hints** | No | Yes (IndexNow integration) |

---

## Implementation Plan

### 1. Create `cloudflare-pro-optimize` Edge Function

A single edge function that programmatically configures all Pro-tier settings via the Cloudflare API:

**Speed Settings:**
- Enable **Polish** (lossy mode) — automatically compresses all product/store images at the edge without code changes. This is huge for a marketplace with thousands of product images.
- Confirm **Brotli**, **Early Hints**, **HTTP/3**, **0-RTT** are still enabled
- Confirm **Rocket Loader** and **Mirage** remain OFF (break SPAs)

**Security Settings:**
- Enable **Super Bot Fight Mode** with granular controls:
  - Definitely automated: Block
  - Likely automated: Managed Challenge  
  - Verified bots (Google, Discord, etc.): Allow
- Enable **Cloudflare OWASP Core Ruleset** (Pro unlocks this)
- Add WAF custom rules:
  - Rate limit `/functions/v1/` to 60 req/min per IP
  - Challenge traffic to `/admin/*`, `/ip-staff/*`, `/global-guard/` paths

**Caching:**
- Create **Cache Rules** via Rulesets API (Pro has enough quota):
  - Static assets (`/assets/`, `.js`, `.css`, `.woff2`, images): Edge TTL 30 days, Browser TTL 1 year
  - Fonts (`/fonts/`): Edge TTL 365 days
  - HTML/SPA routes: Bypass cache (ensures fresh `index.html`)

**Redirect Rules:**
- `www.eclipserblx.com` → `eclipserblx.com` (301)
- Trailing slash normalization (optional)

**Transform Rules (response headers):**
- Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- SEO headers: `X-Robots-Tag: noindex` for `/admin/*`, `/seller/*`, `/ip-staff/*`

**Crawler Hints:**
- Enable Crawler Hints if available via API (pushes IndexNow pings automatically when Cloudflare detects content changes)

### 2. Update Documentation

Update `docs/cloudflare-optimization-guide.md` to reflect Pro-tier settings and mark items as automated vs manual.

### 3. Update Memory

Store the new Pro-tier configuration details for future reference.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/cloudflare-pro-optimize/index.ts` | **Create** — single function that applies all Pro settings |
| `docs/cloudflare-optimization-guide.md` | **Update** — mark Pro features as enabled |

---

## What You Need to Do Manually (Dashboard Only)

Some settings cannot be configured via API:
- **Upgrade plan**: Cloudflare Dashboard → Overview → Change plan to Pro
- **Smart Tiered Caching**: Verify it's on (Caching → Tiered Cache)
- **HSTS preload**: Already configured but verify in SSL/TLS → Edge Certificates

---

## Expected Impact

- **Images**: 20-40% smaller via Polish lossy compression — faster product page loads with zero code changes
- **Security**: OWASP ruleset blocks SQLi/XSS at the edge before requests hit the origin; Super Bot Fight Mode stops scrapers
- **SEO**: Crawler Hints proactively notify search engines of content changes
- **Performance**: More cache rules = better edge caching granularity

