

## Root Cause Analysis: Custom Domain Error 1000

After thorough investigation of the Cloudflare API responses, DNS records, and official documentation, I've identified the **actual root cause** that has been missed in all previous attempts.

### The Problem

There are **two critical misconfigurations** working together:

1. **Fallback Origin is stuck in "initializing" status** — The Cloudflare for SaaS fallback origin (set to `eclipserblx.com`) has been in "initializing" state since March 9 and has NEVER become "active". This means **no custom hostname can ever route traffic**. The custom hostname for `has.h-and-c.co.uk` exists and has active SSL, but Cloudflare has nowhere to send the traffic.

2. **`stores.eclipserblx.com` is DNS-only (grey cloud)** — Per Cloudflare's official documentation: *"The fallback origin is where Cloudflare will route traffic sent to your custom hostnames (**must be proxied**)."* Currently `stores.eclipserblx.com` has `proxied: false`.

### Why Previous Fixes Failed

- **Setting `stores.eclipserblx.com` to orange cloud alone** didn't work because the fallback origin was set to `eclipserblx.com` (the apex), not `stores.eclipserblx.com`.
- **The fallback origin `eclipserblx.com`** likely can't activate because the apex has a Cloudflare Worker bound to it (`eclipse-og-proxy`), creating a conflict.

### The Fix (3 steps)

1. **Set `stores.eclipserblx.com` to proxied (orange cloud)** — This is REQUIRED for it to serve as a fallback origin.

2. **Change the fallback origin from `eclipserblx.com` to `stores.eclipserblx.com`** — A dedicated subdomain without Worker conflicts.

3. **Wait for fallback origin status to become "active"** — Then verify `has.h-and-c.co.uk` works.

### Technical Implementation

Create a temporary edge function (`cf-fix-fallback`) that:
- Updates the `stores.eclipserblx.com` DNS record to `proxied: true` via the Cloudflare API
- Sets the fallback origin to `stores.eclipserblx.com` via `PUT /zones/{zone_id}/custom_hostnames/fallback_origin`
- Returns the new fallback origin status for verification

Then clean up the temporary function after execution.

### Why This Will Work

The official Cloudflare for SaaS flow:
```text
has.h-and-c.co.uk (seller CNAME, grey cloud)
  → stores.eclipserblx.com (proxied/orange cloud, fallback origin)
    → Cloudflare edge matches custom hostname
      → Routes to origin IP 185.158.133.1
```

With the fallback origin actually active, Cloudflare's edge will intercept requests to `has.h-and-c.co.uk`, match them against the custom hostname registry, and route them correctly — eliminating Error 1000.

