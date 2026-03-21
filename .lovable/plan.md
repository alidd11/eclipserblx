

## Root Cause Analysis: Cloudflare Worker Proxy + Unpublished Auth Fixes

After deep investigation across Cloudflare diagnostics, auth logs, worker script, and client code, I've identified the real problem — it's two things working together.

### What's actually happening

**1. Your auth hardening code changes have NOT been published to production.**

All the auth fixes we've been making (token validation, JWT retry logic, safety timeouts in `useAuth`, `useAdminAuth`, `useUserPermissions`) exist only in the preview build. Users on `eclipserblx.com` are still running the OLD code that hangs on stale JWTs. The `force_update` we pushed only triggers a reload — it doesn't deploy new code. The new code needs to be **published**.

**2. `cloudflare-pro-optimize` conflicts with `fix-cloudflare-security`**

These two edge functions fight each other:
- `cloudflare-pro-optimize` sets `browser_check: "on"` and creates a "Challenge admin/staff paths" WAF rule
- `fix-cloudflare-security` sets `browser_check: "off"` and disables the admin challenge rule

If `cloudflare-pro-optimize` ever runs again (e.g. if someone re-optimizes), it will:
- Re-enable browser integrity check → iOS PWA WebViews get challenged on cold open → crash
- Re-enable admin path challenges → admin dashboard blocked by Cloudflare interstitial

I just ran `fix-cloudflare-security` and confirmed the settings are correct NOW (browser_check: off, admin challenge: disabled). But the code conflict remains.

### The fix (2 steps)

**Step 1: Fix `cloudflare-pro-optimize` to stop conflicting**
- File: `supabase/functions/cloudflare-pro-optimize/index.ts`
- Change `browser_check` from `"on"` to `"off"` (line 81)
- Remove or disable the "Challenge admin/staff paths" WAF rule creation (lines 336-343) — admin auth is already handled by the app's own auth system, not by Cloudflare challenges
- This prevents future runs of the optimizer from breaking the site

**Step 2: Publish the app**
- The auth fixes (token validation, JWT retry, safety timeouts) are already in the codebase
- Publishing deploys these to production at `eclipserblx.com`
- After publish, force update v1.0.87 will trigger a reload for all connected clients, pulling the new auth-hardened code

### Why the Cloudflare settings aren't the cause right now

I verified: `browser_check` is currently `"off"`, admin challenge is `"disabled"`, security level is `"medium"`, SBFM is set to allow. These are all correct. The worker is passing human traffic through correctly (`x-eclipse-worker: pass-human`). DNS resolves properly through Cloudflare proxy to the worker.

The issue is purely that the live production code at `eclipserblx.com` still has the OLD auth bootstrap that hangs on stale JWTs — because the fixes were never published.

### Technical detail
- File to modify: `supabase/functions/cloudflare-pro-optimize/index.ts`
  - Line 81: `patchSetting("browser_check", "on", "browser_check")` → change to `"off"`
  - Lines 336-343: Remove the admin challenge WAF rule from the `wafRules` array (keep it as an empty array or remove the rule object)
- No other file changes needed — the auth fixes are already done
- After code change: **Publish the app**

