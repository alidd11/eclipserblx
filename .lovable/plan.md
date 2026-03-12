

# Proactive Cloudflare Zone Warning During Domain Setup

## What this does

When a seller types a domain and clicks "Add Domain", the system already detects Cloudflare zones and shows a toast. But this is **after** the domain is registered in the database. The improvement adds a **pre-submission check** that warns sellers about Cloudflare proxied records *before* they commit, giving them a chance to fix DNS first.

## Approach

### 1. New edge function action: `pre-check-domain`

Add a lightweight action to `store-domain-manager/index.ts` that:
- Runs `detectCloudflareZone(domain)` to check if nameservers are Cloudflare
- Runs `detectProxiedCname(domain)` to check if existing A/CNAME records are proxied (orange-cloud)
- Checks if the domain already resolves to any IP (existing records that might conflict)
- Returns a warning payload **without** creating any database records

```typescript
// Returns: { is_cloudflare: bool, has_proxied_records: bool, existing_records: [...], warnings: string[] }
```

### 2. Frontend: Add pre-check step to the "Add Domain" flow

In `SellerSettingsDomain.tsx`:
- When seller clicks "Add Domain", first call `pre-check-domain` 
- If warnings are returned (Cloudflare zone detected, proxied records found), show a **confirmation dialog** with:
  - Clear warning about Error 1000 risk
  - Specific instructions (set DNS-only, pause CF, etc.)
  - "I understand, proceed anyway" and "Cancel" buttons
- If no warnings, proceed directly to `request-custom-domain` as today
- Add a loading state ("Checking domain...") during the pre-check

### 3. Warning dialog UI

A simple `AlertDialog` that shows:
- Orange warning banner if Cloudflare zone detected
- Red warning if proxied records already exist (Error 1000 is almost guaranteed)
- Bullet list of what they need to do before or after connecting
- Proceed / Cancel actions

## Files changed

| File | Change |
|------|--------|
| `supabase/functions/store-domain-manager/index.ts` | Add `pre-check-domain` action (~30 lines) |
| `src/pages/seller/SellerSettingsDomain.tsx` | Add pre-check mutation, confirmation dialog, updated "Add Domain" flow |

