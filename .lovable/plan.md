

## Plan: Enhance Cloudflare Pro Performance Settings

After reviewing the existing `cloudflare-pro-optimize` edge function, here's what I'll add and fix:

### Bug Fix
- Line 293 references `transformPayload` which is **undefined** — the else branch for transform rules would crash. Fix to use inline payload.

### New Performance Additions

1. **Stale-While-Revalidate cache headers** — Update cache rules to include `stale-while-revalidate` so users get instant cached responses while CF refreshes in the background.

2. **Tiered Cache (Smart)** — Enable via API (`cache_level` + tiered caching endpoint) to use CF's global PoP network as a multi-tier cache, reducing origin hits.

3. **Browser Cache TTL optimization** — Ensure HTML responses have `no-cache` while static assets get long-lived immutable caching.

4. **Security header additions** — Add `X-DNS-Prefetch-Control: on` and `Strict-Transport-Security` to transform rules.

### Files Changed
- `supabase/functions/cloudflare-pro-optimize/index.ts` — Fix transform bug, add tiered cache, enhance cache rules with SWR

### Not Adding (and why)
- **Argo Smart Routing** — Requires separate Cloudflare billing activation, can't be toggled via API alone
- **Zaraz** — Requires dashboard setup for each analytics tag
- **Image Resizing** — Requires Business plan ($200/mo), not available on Pro

