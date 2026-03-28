

# Two Issues to Fix

## Issue 1: Bot ENV not loading (`DISCORD_CUSTOMER_BOT_TOKEN`)

Altair says the `.env` is set up but the bot crashes with "Missing required env var: DISCORD_CUSTOMER_BOT_TOKEN". The bot uses ES modules (`"type": "module"`) and has no `dotenv` dependency — Node.js does not auto-load `.env` files.

**Fix:** Add `dotenv` as a dependency and load it at the top of `index.js`:

- Add `"dotenv": "^16.4.0"` to `package.json` dependencies
- Add `import 'dotenv/config';` as the first line of `index.js` (before any other imports)
- Also add the same import to `src/register-commands.js` so env vars load when registering commands

This is the standard Node.js pattern for loading `.env` files.

## Issue 2: Bot subdomains being hijacked

Three subdomains need to point to Apollo Panel instead of the main site:
- `staff.eclipserblx.com` → CNAME `proxy-eu.apollopanel.com` (DNS-only)
- `tracker.eclipserblx.com` → CNAME `proxy-eu.apollopanel.com` (DNS-only)
- `forms.eclipserblx.com` → CNAME `proxy-eu.apollopanel.com` (DNS-only)

**Changes needed:**

1. **`src/hooks/useStoreDomain.tsx`** — Add `staff`, `tracker`, `forms` to `RESERVED_SUBDOMAINS` array so the store domain resolver ignores them

2. **Cloudflare Worker reference (`docs/cloudflare-worker-og.js`)** — Add `staff`, `tracker`, `forms` to `RESERVED_SUBS` so the Worker passes them through without intercepting

3. **Deploy Worker** — The actual Worker needs redeployment with the updated reserved list (via the `deploy-cloudflare-worker` edge function)

4. **DNS records** — Create CNAME records for all three subdomains pointing to `proxy-eu.apollopanel.com` with proxy disabled (DNS-only/grey cloud). This will be done via the Cloudflare API, replacing any existing A records from the wildcard

5. **New edge function `setup-bot-subdomains`** — A one-time function to create the three CNAME records via Cloudflare API with `proxied: false`

## Files to modify
- `eclipse-portal-bot/package.json` — add dotenv dependency
- `eclipse-portal-bot/index.js` — add `import 'dotenv/config'`
- `eclipse-portal-bot/src/register-commands.js` — add `import 'dotenv/config'`
- `src/hooks/useStoreDomain.tsx` — extend reserved subdomains
- `docs/cloudflare-worker-og.js` — extend reserved subs
- `supabase/functions/deploy-cloudflare-worker/index.ts` — extend reserved subs in the built Worker script
- New: `supabase/functions/setup-bot-subdomains/index.ts` — create CNAME records via CF API
- Update embedded bot files in `src/pages/admin/PortalBotSetup.tsx` to include dotenv

