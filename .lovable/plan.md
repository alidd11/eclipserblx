

## Remove Eclipse+ from Edge Functions & Discord Bot Code

### Scope
~50 references across 16 edge functions and 4 bot files. All are user-facing text, comments, or logic tied to the removed Eclipse+ membership. Database column names (`eclipse_plus_discount_enabled`, `eclipse_plus_bonus_claimed`, `eclipse_plus_days`) are left as-is since they're DB schema — renaming columns is a separate migration.

### Files & Changes

**Edge Functions (12 files):**

| File | What changes |
|------|-------------|
| `discord-customer-bot/index.ts` | "Eclipse+ (Active)" → "Pro (Active)" in profile; role name refs "Eclipse+" → use generic; eligibility text "Subscribe to Eclipse+" removed |
| `discord-global-guard-bot/index.ts` | "Upgrade to Eclipse+" → "Upgrade your plan"; "Eclipse+ • Priority Sync" → "Premium • Priority Sync"; "Eclipse+ Member" → "Premium Member"; pricing text remove Eclipse+ upsell |
| `discord-oauth-callback/index.ts` | Comment "Eclipse+ subscription" → "Pro subscription"; role assignment label "Eclipse+" → role variable name only |
| `botghost-customer-api/index.ts` | "Access Eclipse+ perks" → "Access member perks" |
| `claim-signup-promotion/index.ts` | Update comments only (logic uses DB column names which stay) |
| `create-payment-intent/index.ts` | Update comment text |
| `notify-product-approved/index.ts` | "Eclipse+ members get early access!" → "Members get early access!"; footer "Eclipse+ Early Access" → "Early Access" |
| `send-product-drop-webhook/index.ts` | Same early access text cleanup |
| `send-promotion-discord-webhook/index.ts` | "days of Eclipse+ free!" → "days of Pro free!" |
| `stripe-subscription-webhook/index.ts` | "Eclipse+ activated/deactivated" → "Subscription activated/deactivated" |
| `og-proxy/index.ts` | Remove `/eclipse-plus` route and nav link |
| `dynamic-sitemap/index.ts` | Remove `/eclipse-plus` URL entry |
| `submit-indexnow/index.ts` | Remove `/eclipse-plus` from URL list |
| `sync-discord-roles/index.ts` | Comment update "Eclipse+ role" → "subscription role" |
| `sync-global-bans/index.ts` | "upgrade to Eclipse+" → "upgrade your plan" |
| `verify-payment/index.ts` | Comment update only |

**Eclipse Portal Bot (3 files):**

| File | What changes |
|------|-------------|
| `commands/profile.js` | "Eclipse+ (Active)" → "Pro (Active)" |
| `commands/getrole.js` | "Eclipse+" role label → "Pro"; eligibility text updated |
| `commands/update.js` | "Eclipse+" role label → "Pro" |

### What stays unchanged
- Database column names (`eclipse_plus_days`, `eclipse_plus_discount_enabled`, etc.) — these are schema-level and would need a migration
- The `eclipsePlusRoleId` config variable — it's the Discord role ID variable name, harmless internally
- Frontend files querying those DB columns

### Risk
Low — text and comment changes only. No logic changes except removing the dead `/eclipse-plus` sitemap/OG entries.

