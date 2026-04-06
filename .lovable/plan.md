

## Redundancy & Bottleneck Audit — What to Clean Up

After a full codebase scan, there are two major categories of dead weight slowing down your deployments, adding cold-start costs, and creating confusion.

---

### Category 1: Ghost Config Entries (24 entries)

Your `supabase/config.toml` has **24 function entries** pointing to functions that **no longer have code**. Every deployment, the platform tries to resolve these — wasting build time and cluttering logs. These are pure noise:

`check-offender-activity`, `generate-vapid-keys`, `get-vapid-public-key`, `create-global-guard-checkout`, `create-credit-checkout`, `create-ad-subscription-checkout`, `create-identity-verification`, `check-product-purchase`, `verify-roblox-badge`, `verify-roblox-gamepass`, `verify-roblox-premium`, `verify-roblox-group`, `send-mass-email`, `send-store-deactivation-email`, `send-store-reactivation-email`, `list-staff`, `ionos-dns-manager`, `check-paypal-funding`, `check-wise-funding`, `claim-free-product`, `create-subscription-checkout`, `create-checkout`, `send-eclipse-plus-announcement`, `grant-eclipse-credits-to-members`

**Fix**: Remove all 24 entries from `config.toml`. Also call the delete tool to remove any lingering deployed versions.

---

### Category 2: Eclipse+ Ghost Code (The Big One)

Eclipse+ was removed as a feature — the hooks (`useSubscription`, `useSubscriptionTiers`) are stubbed to return "not subscribed / no discount". But **the entire Eclipse+ surface area is still in the codebase**, creating:

- **Wasted computation**: ~18 components still call `useSubscription()`, run discount calculations, and render "Join Eclipse+" CTAs that will never activate
- **Confusing UX**: Product pages show "Eclipse+" badges and links to `/eclipse-plus` (a page that likely doesn't work)
- **Dead backend logic**: `stripe-subscription-webhook` still grants `eclipse_plus_member` roles and credit bonuses; `sync-discord-roles` still assigns Eclipse+ Discord roles; `charge-saved-method` still calculates Eclipse+ discounts server-side
- **Dead admin features**: Promotions page still manages "Eclipse+ days" rewards; Discord settings still configure Eclipse+ webhooks; `GrantEclipsePlusDialog` still exists

Specific files with Eclipse+ dead code:

| Area | Files |
|---|---|
| **Frontend components** | `PriceDisplay.tsx`, `FeaturedProductCard.tsx`, `MostPopularSection.tsx`, `RecentReleasesCarousel.tsx`, `MarketplaceSection.tsx`, `PWAFeaturedProducts.tsx`, `LandingFeaturedProducts.tsx` |
| **Pages** | `ProductDetail.tsx`, `Featured.tsx`, `Products.tsx`, `StorePage.tsx`, `Cart.tsx`, `Checkout.tsx`, `Promotions.tsx`, `TermsOfService.tsx` |
| **Admin** | `GrantEclipsePlusDialog.tsx`, `AnnouncementsTab.tsx`, `DiscordSettings.tsx`, `StaffDirectory.tsx` |
| **Hooks** | `useSubscription.ts` (stub), `useSubscriptionTiers.ts` (stub), `useDiscordSettings.ts` |
| **Edge functions** | `stripe-subscription-webhook` (Eclipse+ role grants + credit bonuses), `sync-discord-roles` (Eclipse+ role sync), `charge-saved-method` (Eclipse+ pricing), `claim-signup-promotion` (Eclipse+ days rewards), `check-subscription` (full Eclipse+ check) |
| **SEO/Sitemap** | `dynamic-sitemap` and `submit-indexnow` reference `/eclipse-plus` |

**Fix**: Strip all Eclipse+ references — remove discount calculations from components, remove "Join Eclipse+" CTAs, clean the edge functions of dead Eclipse+ logic, remove the Eclipse+ promotion type from admin, and remove the stubbed hooks' discount functions.

---

### Steps

1. **Remove 24 ghost entries from `config.toml`** and delete deployed ghosts
2. **Strip Eclipse+ from frontend** — remove `useSubscription()` calls from ~18 components, remove discount badges/CTAs, remove `storeEclipseEnabled` prop threading
3. **Strip Eclipse+ from edge functions** — remove credit bonus grant and role assignment from `stripe-subscription-webhook`, remove Eclipse+ role sync from `sync-discord-roles`, remove Eclipse+ pricing from `charge-saved-method`
4. **Clean admin pages** — remove Eclipse+ promotion type from Promotions, remove Eclipse+ webhook config from Discord Settings, remove `GrantEclipsePlusDialog`
5. **Clean SEO** — remove `/eclipse-plus` from sitemap and IndexNow
6. **Simplify stubs** — since nothing uses them anymore, reduce `useSubscription.ts` and `useSubscriptionTiers.ts` to bare re-exports or delete entirely

### Impact
- Faster deployments (24 fewer ghost resolutions)
- Cleaner product pages (no phantom discount UI)
- Reduced edge function execution time (no dead discount math on every purchase)
- Smaller bundle (removing ~18 unnecessary `useSubscription` hook imports)

### Files Changed
- `supabase/config.toml` — Remove 24 ghost entries
- ~18 frontend component/page files — Remove `useSubscription` imports and Eclipse+ UI
- `supabase/functions/stripe-subscription-webhook/index.ts` — Remove Eclipse+ role/credit logic
- `supabase/functions/sync-discord-roles/index.ts` — Remove Eclipse+ role sync
- `supabase/functions/charge-saved-method/index.ts` — Remove Eclipse+ pricing
- `supabase/functions/_shared/stripe-helpers.ts` — Remove Eclipse+ discount constants
- `src/pages/admin/Promotions.tsx` — Remove Eclipse+ promotion type
- `src/components/admin/GrantEclipsePlusDialog.tsx` — Delete
- `src/components/admin/discord-settings/AnnouncementsTab.tsx` — Remove Eclipse+ webhook
- `src/hooks/useDiscordSettings.ts` — Remove Eclipse+ webhook/channel fields
- `supabase/functions/dynamic-sitemap/index.ts` — Remove `/eclipse-plus` URL
- `supabase/functions/submit-indexnow/index.ts` — Remove `/eclipse-plus` URL

