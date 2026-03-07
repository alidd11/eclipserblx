# Cloudflare Optimization Guide for Eclipse

This guide covers all recommended Cloudflare settings for eclipserblx.com.

---

## 1. Caching & Page Rules

### Browser Cache TTL (Settings → Caching → Configuration)
- Set **Browser Cache TTL** to **1 year** (for hashed Vite assets)
- Enable **Always Online™** so Cloudflare serves stale pages if origin is down

### Cache Rules (Rules → Cache Rules)

Create these cache rules in order:

#### Rule 1: Cache static assets aggressively
- **When**: URI path contains `/assets/` OR URI path ends with `.js` `.css` `.woff2` `.webp` `.png` `.jpg` `.svg` `.ico`
- **Then**:
  - Cache eligible: Yes
  - Edge TTL: 30 days
  - Browser TTL: 1 year
  - Cache Key: Ignore query string

#### Rule 2: Cache fonts with immutable headers
- **When**: URI path starts with `/fonts/`
- **Then**:
  - Edge TTL: 365 days
  - Browser TTL: 1 year

#### Rule 3: Don't cache HTML (SPA)
- **When**: URI path equals `/` OR NOT (URI path contains `.`)
- **Then**:
  - Edge TTL: Bypass cache
  - Browser TTL: No cache
  - This ensures the SPA always gets fresh `index.html`

---

## 2. Speed Optimizations

### Settings → Speed → Optimization

| Setting | Recommended | Why |
|---------|-------------|-----|
| **Auto Minify** | JS ✅ CSS ✅ HTML ✅ | Strips whitespace/comments at the edge |
| **Brotli** | ✅ On | Better compression than gzip (~15-20% smaller) |
| **Early Hints (103)** | ✅ On | Sends preload hints while origin processes request |
| **HTTP/2** | ✅ On (default) | Multiplexed connections |
| **HTTP/3 (QUIC)** | ✅ On | Faster connections, especially on mobile |
| **Rocket Loader** | ❌ Off | Can break SPAs — leave off for React apps |
| **Mirage** | ❌ Off (Pro+) | Image lazy loading — we handle this in code |
| **Polish** | ✅ Lossy (Pro+) | Automatic image compression at the edge |

### Speed → Optimization → Content Optimization
- **Cloudflare Fonts**: ❌ Off (we self-host fonts already)

---

## 3. Security Hardening

### SSL/TLS (SSL/TLS → Overview)
- Mode: **Full (strict)**
- Minimum TLS Version: **TLS 1.2**
- TLS 1.3: ✅ On
- Always Use HTTPS: ✅ On
- HSTS: ✅ Enable with:
  - Max-Age: 12 months
  - Include subdomains: Yes
  - Preload: Yes
  - No-Sniff: Yes

### Security → WAF
Enable these managed rules:

- **Cloudflare Managed Ruleset**: ✅ On (blocks common attacks: SQLi, XSS, etc.)
- **Cloudflare OWASP Core Ruleset**: ✅ On (paranoia level 1 — balanced)

### Security → Bots
- **Bot Fight Mode**: ✅ On — blocks known bad bots
- **Super Bot Fight Mode** (Pro+): Configure to:
  - Definitely automated: Block
  - Likely automated: Managed Challenge
  - Verified bots: Allow (keeps Googlebot, Discordbot etc. working)

### Custom WAF Rules (Security → WAF → Custom Rules)

#### Rule: Rate limit API proxy
- **When**: URI path contains `/functions/v1/`
- **Then**: Rate limit to 60 requests per minute per IP
- Action on exceed: Block for 10 minutes

#### Rule: Block sensitive paths from external access
- **When**: URI path starts with `/admin/` AND NOT (IP is in your allowlist)
- **Then**: Block
- *Note: This is defense-in-depth; your app already has auth, but this adds an edge layer*

#### Rule: Challenge suspicious countries (optional)
- If your audience is primarily UK/US, you can challenge traffic from high-abuse countries

### Security → Settings
- **Security Level**: Medium
- **Challenge Passage**: 30 minutes
- **Browser Integrity Check**: ✅ On

---

## 4. Redirect Rules

### Rules → Redirect Rules

#### Rule 1: www → root redirect
- **When**: Hostname equals `www.eclipserblx.com`
- **Then**: Dynamic redirect to `https://eclipserblx.com${http.request.uri.path}`
- Status: 301 (Permanent)
- Preserve query string: Yes

#### Rule 2: Force HTTPS
- Already handled by "Always Use HTTPS" in SSL settings
- No need for a separate rule

#### Rule 3: Trailing slash normalization (optional)
- **When**: URI path ends with `/` AND URI path is not `/`
- **Then**: Redirect to same URL without trailing slash
- Status: 301

---

## 5. Additional Recommendations

### Network
- **HTTP/3**: ✅ On
- **0-RTT**: ✅ On (faster reconnections)  
- **WebSockets**: ✅ On (needed for Supabase Realtime)
- **gRPC**: ❌ Off (not used)
- **Pseudo IPv4**: Off

### Scrape Shield
- **Email Address Obfuscation**: ✅ On
- **Server-Side Excludes**: ✅ On
- **Hotlink Protection**: ❌ Off (product images need to be embeddable for OG previews)

### Caching → Tiered Cache
- ✅ Enable **Smart Tiered Caching** (free) — reduces origin requests by using Cloudflare's global network as multi-tier cache

---

## 6. Summary Checklist

- [ ] SSL: Full (strict) + TLS 1.2 min + HSTS
- [ ] Speed: Brotli + Early Hints + HTTP/3 + Auto Minify (no Rocket Loader)
- [ ] Cache: Long TTLs for assets, bypass for HTML
- [ ] WAF: Managed rulesets + bot fight mode
- [ ] Redirects: www→root 301, HTTPS forced
- [ ] WebSockets enabled for realtime
- [ ] Smart Tiered Caching enabled
