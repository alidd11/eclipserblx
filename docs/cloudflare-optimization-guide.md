# Cloudflare Pro Optimization Guide for Eclipse

This guide covers all Cloudflare settings for eclipserblx.com on the **Pro plan ($20/mo)**.

Settings marked with 🤖 are **automated** via the `cloudflare-pro-optimize` backend function.

---

## 1. Speed & Performance

### Settings (🤖 Automated)

| Setting | Value | Why |
|---------|-------|-----|
| **Polish** 🤖 | Lossy + WebP | Auto-compresses product images 20-40% at edge |
| **Auto Minify** 🤖 | JS ✅ CSS ✅ HTML ✅ | Strips whitespace/comments |
| **Brotli** 🤖 | ✅ On | ~15-20% better compression than gzip |
| **Early Hints (103)** 🤖 | ✅ On | Preload hints while origin processes |
| **HTTP/2 Prioritization** 🤖 | ✅ On | Smarter resource ordering (Pro) |
| **HTTP/3 (QUIC)** 🤖 | ✅ On | Faster mobile connections |
| **0-RTT** 🤖 | ✅ On | Faster reconnections |
| **Speed Brain** 🤖 | ✅ On | Speculative prefetching |
| **Rocket Loader** 🤖 | ❌ Off | Breaks React SPAs |
| **Mirage** 🤖 | ❌ Off | We handle lazy loading in code |
| **Always Online** 🤖 | ✅ On | Serves stale pages if origin is down |

### Manual Verification
- **Crawler Hints**: Enable in Speed → Optimization → Content Optimization (pushes IndexNow automatically)
- **Cloudflare Fonts**: ❌ Off (we self-host fonts)

---

## 2. Caching

### Cache Rules (🤖 Automated via Rulesets API)

| Rule | Match | Edge TTL | Browser TTL |
|------|-------|----------|-------------|
| Static assets 🤖 | `/assets/`, `.js`, `.css`, `.woff2`, images | 30 days | 1 year |
| Fonts 🤖 | `/fonts/` | 365 days | 1 year |
| HTML/SPA 🤖 | `/` or paths without `.` | Bypass | No cache |

### Manual Verification
- **Smart Tiered Caching**: ✅ Enable (Caching → Tiered Cache) — uses CF global network as multi-tier cache

---

## 3. Security

### SSL/TLS
- Mode: **Full (strict)**
- Minimum TLS Version: **TLS 1.2**
- TLS 1.3: ✅ On
- Always Use HTTPS: ✅ On
- HSTS: ✅ (12 months, include subdomains, preload, no-sniff)

### WAF Managed Rulesets (🤖 Automated)

| Ruleset | Action |
|---------|--------|
| **Cloudflare Managed Ruleset** 🤖 | Enabled — blocks SQLi, XSS, etc. |
| **Cloudflare OWASP Core Ruleset** 🤖 | Enabled (managed_challenge) — Pro feature |

### WAF Custom Rules (🤖 Automated)

| Rule | Match | Action |
|------|-------|--------|
| Rate limit API 🤖 | `/functions/v1/` | 60 req/min per IP → managed challenge |
| Challenge admin paths 🤖 | `/admin/*`, `/ip-staff/*`, `/global-guard/*` | Managed challenge |

### Bot Management (🤖 Automated)

| Setting | Value |
|---------|-------|
| **Super Bot Fight Mode** 🤖 | Enabled (Pro) |
| Definitely automated 🤖 | Block |
| Likely automated 🤖 | Managed Challenge |
| Verified bots 🤖 | Allow (Google, Discord, etc.) |

### Other Security (🤖 Automated)
- **Browser Integrity Check** 🤖: ✅ On
- **Email Obfuscation** 🤖: ✅ On
- **Server-Side Excludes** 🤖: ✅ On
- **Hotlink Protection**: ❌ Off (product images need OG preview embedding)

---

## 4. Transform Rules — Response Headers (🤖 Automated)

### Security Headers (all responses)
| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

### SEO Headers
| Path | Header |
|------|--------|
| `/admin/*`, `/seller/*`, `/ip-staff/*`, `/global-guard/*` | `X-Robots-Tag: noindex, nofollow` |
| All public pages | `Link: <canonical>; rel="canonical"` |

---

## 5. Redirect Rules (🤖 Automated)

| Rule | From | To | Status |
|------|------|----|--------|
| www redirect 🤖 | `www.eclipserblx.com/*` | `eclipserblx.com/*` | 301 |
| Trailing slash 🤖 | `/path/` | `/path` | 301 |
| Force HTTPS | Already handled by SSL settings | — | — |

---

## 6. Network Settings

| Setting | Value |
|---------|-------|
| **HTTP/3** 🤖 | ✅ On |
| **0-RTT** 🤖 | ✅ On |
| **WebSockets** | ✅ On (needed for realtime) |
| **gRPC** | ❌ Off |

---

## 7. Running the Optimization

Invoke the `cloudflare-pro-optimize` backend function from the admin panel or directly. It will apply all 🤖 settings in one call and return a detailed report of what succeeded.

### Manual Steps After Running
- [ ] Verify Smart Tiered Caching is enabled
- [ ] Verify HSTS is configured on Edge Certificates
- [ ] Enable Crawler Hints in Speed → Optimization (if not applied via API)
- [ ] Confirm WebSockets are enabled in Network settings

---

## 8. Expected Impact

| Area | Improvement |
|------|-------------|
| **Images** | 20-40% smaller via Polish lossy + WebP |
| **Security** | OWASP + Managed rulesets block attacks at edge |
| **Bots** | Super Bot Fight Mode stops scrapers, allows verified bots |
| **SEO** | Crawler Hints + canonical headers + noindex on private paths |
| **Caching** | Granular edge/browser TTLs reduce origin load |
