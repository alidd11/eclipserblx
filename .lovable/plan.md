

# Custom Store Domains — Full Implementation Plan

## Overview
Provide a Payhip-like custom domain service where sellers can get a free subdomain (`store.eclipserblx.com`) or pay for a full custom domain (`mystore.com`) that renders their store in a standalone, branded experience.

## Architecture

```text
Visitor → mystore.com or cool.eclipserblx.com
         ↓
   Cloudflare (wildcard DNS + SSL for SaaS)
         ↓
   App loads on eclipserblx.com origin
         ↓
   AppRoutes checks hostname
         ↓
   Matches store_domains table → renders StoreStandalonePage
   (no marketplace header/footer, store-branded)
```

## Phase 1: Database

### New table: `store_domains`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| store_id | uuid FK → stores | |
| domain | text UNIQUE | `cool.eclipserblx.com` or `mystore.com` |
| domain_type | text | `subdomain` or `custom` |
| status | text | `pending`, `verifying`, `active`, `failed`, `removed` |
| verification_token | text | Random token for TXT record |
| verified_at | timestamptz | |
| ssl_status | text | `pending`, `active`, `failed` |
| is_primary | boolean | default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: Sellers read/manage own domains. Staff can manage all. Public can read `active` domains (for hostname lookup).

### New table: `store_domain_billing` (tracks paid custom domain subscriptions)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| store_domain_id | uuid FK → store_domains | |
| stripe_subscription_id | text | |
| status | text | `active`, `cancelled`, `past_due` |
| current_period_end | timestamptz | |
| created_at | timestamptz | |

## Phase 2: Edge Function — `store-domain-manager`

Handles all domain lifecycle operations:
- **`claim-subdomain`** — Validates slug availability, creates `slug.eclipserblx.com` A record via Cloudflare API (wildcard already covers this, but registers in DB)
- **`request-custom-domain`** — Generates verification token, stores pending record
- **`verify-custom-domain`** — Checks TXT record `_eclipsestore-verify=TOKEN` via DoH, updates status
- **`provision-ssl`** — Uses Cloudflare Custom Hostnames API (SSL for SaaS) to provision cert
- **`check-status`** — Returns current domain + SSL status
- **`remove-domain`** — Cleans up Cloudflare records + DB entry

Uses existing `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` secrets.

## Phase 3: Frontend — Domain Detection + Standalone Mode

### 3a. Domain resolver in `AppRoutes.tsx`
Extend existing hostname check pattern (already checks `guard.eclipserblx.com`):
1. Check if hostname is a known subdomain (`*.eclipserblx.com` but not `guard.*` or main domain)
2. Or check if hostname is a non-Eclipse domain
3. Query `store_domains` table for active domain → get `store_id`
4. Render `StoreStandalonePage` instead of normal routes

### 3b. `StoreStandalonePage` component
- Renders the store in full standalone mode (no marketplace Header/Footer)
- Shows store logo in a minimal header, "Powered by Eclipse" footer badge
- All store sub-routes work: products, reviews, about, checkout
- Cart and checkout function within the custom domain origin
- Auth redirects use the custom domain as origin

### 3c. Auth compatibility
Extend `isCustomDomainAuth()` in `Auth.tsx` to handle store custom domains — OAuth callbacks must return to the correct origin.

## Phase 4: Seller Dashboard UI

### New page: `SellerSettingsDomain.tsx`
Added to seller settings navigation alongside existing settings pages.

**Free tier section:**
- One-click claim subdomain: `storeslug.eclipserblx.com`
- Status indicator (active/pending)
- Preview link

**Paid tier section (Custom Domain):**
- Input field for custom domain
- Step-by-step DNS instructions:
  1. Add CNAME: `@ → stores.eclipserblx.com`
  2. Add TXT: `_eclipsestore-verify → TOKEN`
- "Check DNS" button → calls verify endpoint
- Status flow: Pending → Verifying → Active
- Subscribe button (Stripe checkout for domain add-on)

## Phase 5: Cloudflare Infrastructure

### One-time manual setup (done by platform admin):
1. Add wildcard A record: `*.eclipserblx.com → 185.158.133.1`
2. Enable Cloudflare for SaaS (Custom Hostnames) on the zone
3. Set fallback origin to `eclipserblx.com`

### Automated via edge function:
- Register custom hostnames via Cloudflare API
- Monitor SSL provisioning status
- Auto-cleanup expired/cancelled domains

## Phase 6: Billing Integration

- Create a Stripe product + price for "Custom Domain Add-on" (e.g., £4.99/month)
- Checkout via existing `create-subscription` pattern
- Webhook handler to activate/deactivate domain on subscription status changes
- Domain automatically set to `removed` status if subscription lapses

## Implementation Order

1. Database migration (`store_domains` + `store_domain_billing` tables + RLS)
2. Edge function `store-domain-manager` (claim, verify, provision, remove)
3. Domain detection in `AppRoutes.tsx` (hostname → store lookup)
4. `StoreStandalonePage` component (standalone store rendering)
5. `SellerSettingsDomain.tsx` (seller UI for managing domains)
6. Stripe billing for custom domains
7. Auth compatibility for custom domain origins
8. End-to-end testing

## End-to-End Test Plan

After implementation, verify:
1. **Subdomain flow**: Seller claims subdomain → DNS resolves → store renders standalone
2. **Custom domain flow**: Seller enters domain → sees DNS instructions → verifies → SSL provisions → store renders
3. **Standalone rendering**: No marketplace nav, store branding only, products/cart/checkout work
4. **Auth on custom domain**: Login/signup/OAuth all redirect correctly
5. **Billing**: Subscribe → domain activates; cancel → domain deactivates
6. **Edge cases**: Invalid domains rejected, duplicate domains blocked, expired subscriptions cleaned up

## Files to Create/Edit

| File | Action |
|------|--------|
| Migration SQL | Create `store_domains` + `store_domain_billing` tables |
| `supabase/functions/store-domain-manager/index.ts` | New edge function |
| `src/components/AppRoutes.tsx` | Add hostname detection for store domains |
| `src/pages/StoreStandalonePage.tsx` | New standalone store page |
| `src/pages/seller/SellerSettingsDomain.tsx` | New seller domain settings |
| `src/pages/Auth.tsx` | Extend `isCustomDomainAuth` for store domains |
| `src/components/store/StoreLayout.tsx` | Add standalone mode prop |

