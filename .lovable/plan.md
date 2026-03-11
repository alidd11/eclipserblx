

# Cloudflare Auto-Fix: Seller API Token Integration

## Overview
Let sellers save their Cloudflare API Token and Zone ID so the system can automatically fix DNS issues (wrong record types, proxied CNAMEs, missing records) with one click. Includes clear guidance on what Cloudflare permissions to set.

## Database Changes

Add two columns to `store_credentials`:
```sql
ALTER TABLE public.store_credentials
  ADD COLUMN IF NOT EXISTS cloudflare_api_token TEXT,
  ADD COLUMN IF NOT EXISTS cloudflare_zone_id TEXT;
```

No new RLS needed — existing policies already restrict `store_credentials` to store owners (read/write) and staff (read).

## Backend: New `auto-fix-dns` action in `store-domain-manager`

When a seller calls `{ action: "auto-fix-dns", domain_id: "..." }`:

1. Authenticate the seller, verify they own the store linked to the domain
2. Fetch `cloudflare_api_token` and `cloudflare_zone_id` from `store_credentials`
3. Using the seller's token, call Cloudflare API to:
   - List existing DNS records for the domain
   - Delete any proxied CNAME or conflicting A records
   - Create a CNAME → `stores.eclipserblx.com` (DNS-only, `proxied: false`)
   - Create www CNAME → `stores.eclipserblx.com` (DNS-only)
   - Ensure TXT verification record exists
4. Re-run health check and return updated results
5. Update `store_domains.last_health_check` with new results

## Frontend Changes

### `SellerSettingsDomain.tsx` — New "Cloudflare Integration" card

Shown below the custom domain card. Contains:
- **Permissions guide** (see below) explaining exactly what token scopes to create
- Two masked input fields: API Token + Zone ID
- Save button that upserts to `store_credentials`
- Token is write-only after save (displayed as `••••••••last4`)

### `DomainHealthDisplay.tsx` — "Auto-Fix" button

When a fixable error is detected (`1000`, `1014`, `proxied_cname`, `403_direct_a`, `403_cloudflare`) AND the seller has saved Cloudflare credentials:
- Show an "Auto-Fix DNS" button alongside the manual steps
- On click, calls `store-domain-manager` with `action: "auto-fix-dns"`
- Shows loading state, then success/failure with updated health check

## Cloudflare Token Permissions Guide (shown in UI)

The seller settings page will display clear instructions:

**How to create your Cloudflare API Token:**

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → My Profile → API Tokens
2. Click **Create Token**
3. Use the **"Edit zone DNS"** template, or create a custom token with:
   - **Permissions:** Zone → DNS → Edit
   - **Zone Resources:** Include → Specific zone → *(select your domain)*
4. Click **Continue to summary** → **Create Token**
5. Copy the token and paste it below

**How to find your Zone ID:**

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → select your domain
2. On the Overview page, scroll down to the right sidebar
3. Copy the **Zone ID** value

The minimum required permission is **Zone:DNS:Edit** scoped to the seller's specific zone. No account-level access is needed.

## Security

- Tokens stored in `store_credentials`, protected by existing RLS (owner-only write, owner+staff read)
- Edge function validates store ownership before accessing credentials
- After save, frontend only displays masked token (`••••last4`), never the full value
- Token is scoped to a single zone with DNS-edit only — minimal blast radius

## Technical Flow

```text
Seller Settings Page          Edge Function              Cloudflare API
┌──────────────────┐          ┌──────────────────┐       ┌──────────────┐
│ Save CF Token    │─────────>│ store_credentials │       │              │
│ + Zone ID        │          │ (upsert)         │       │              │
└──────────────────┘          └──────────────────┘       │              │
                                                         │              │
┌──────────────────┐ auto-fix ┌──────────────────┐       │  Seller's    │
│ Health Error +   │─────────>│ store-domain-    │──────>│  Zone        │
│ "Auto-Fix" btn   │          │ manager          │       │  (DNS Edit)  │
│                  │<─────────│ (reads creds,    │<──────│              │
│ Updated health   │  result  │  fixes DNS)      │ done  │              │
└──────────────────┘          └──────────────────┘       └──────────────┘
```

## Files to create/modify

1. **Migration SQL** — add `cloudflare_api_token` and `cloudflare_zone_id` to `store_credentials`
2. **`supabase/functions/store-domain-manager/index.ts`** — add `auto-fix-dns` action
3. **`src/pages/seller/SellerSettingsDomain.tsx`** — add Cloudflare credentials card with permissions guide + auto-fix button integration
4. **`src/components/domains/DomainHealthDisplay.tsx`** — add "Auto-Fix DNS" button when credentials exist and error is fixable

