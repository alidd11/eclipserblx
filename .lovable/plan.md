

## Enterprise-Level Store Page Overhaul + Seller Subscription Tier Enhancements

Two areas of work: (A) making the public store page feel enterprise-grade on desktop, and (B) expanding the Free vs Pro seller subscription feature set.

---

### A. Store Page — Enterprise Polish

**Current problems:**
- 985-line monolith `StorePage.tsx` with duplicated product grid code (lines 638-761 and 809-923 are nearly identical)
- Store header is centered with large logo (96px) and scattered action buttons — feels like a personal profile, not a professional storefront
- `StoreFloatingHeader` conflicts with the smart sticky header we just built (both fight for `fixed top-0 z-50`)
- Theme system (`getThemeStyles`) adds complexity but most stores use default — enterprise stores (Shopify, Etsy) don't offer per-store visual themes
- Banner section has 6 conditional branches for different themes — overengineered
- Product pagination uses swipe + animated page transitions — enterprise stores use simple load-more or infinite scroll
- Reviews section uses heavy `Card`/`CardHeader` wrappers inconsistent with flattened enterprise style
- Trust signals are tiny (11px text) and easily missed

**Planned changes:**

1. **Store header redesign** — Left-aligned layout on desktop: logo (48px) + store name + verified badge inline, stats as compact pills, action buttons (Follow, Message, Reviews) right-aligned. Matches Shopify/Etsy store header pattern.

2. **Remove StoreFloatingHeader** — It conflicts with the global smart sticky header. The global header already hides/shows on scroll; a second floating bar is redundant.

3. **Simplify banner** — One clean banner render: if `banner_url` exists show it with a single bottom fade, otherwise show a subtle `bg-muted/30` strip. Remove all theme-specific banner branches.

4. **Flatten product grid** — Extract duplicated product grid into a `StoreProductGrid` component. Replace swipe pagination with a simple "Show more" button that appends the next page of products (no animated page transitions).

5. **Flatten Reviews and sections** — Replace `Card` wrappers with `border-t border-border pt-6` dividers matching the product page enterprise style.

6. **Trust signals** — Increase to 12px text, add a thin top border to visually separate from content above.

7. **Bio treatment** — Remove quotation marks and italic styling. Use plain `text-sm text-muted-foreground` with a "Read more" link.

---

### B. Seller Subscription — Free vs Pro Feature Expansion

**Current Free vs Pro limits** (from `useSellerSubscription.ts`):

| Feature | Free | Pro (£7.99/mo) |
|---|---|---|
| Commission | 15% | 10% |
| Max file size | 200 MB | 500 MB |
| Product images | 5 | 15 |
| Product files | 1 | 3 |
| Max products | 25 | Unlimited |
| Store pages | 1 | 5 |
| Ad credit | £0 | £5/mo |
| Pro badge | No | Yes |
| Priority review | No | Yes |

**Recommended additions to differentiate tiers further:**

| New Feature | Free | Pro |
|---|---|---|
| Store themes | Default only | All themes (minimal, bold, gradient, dark) |
| Custom nav links | 2 max | 10 max |
| Store announcement bar | No | Yes |
| Analytics dashboard | Basic (30 days) | Advanced (90 days + export) |
| Discount/coupon codes | 1 active | Unlimited |
| Scheduled banner | No | Yes |

**Implementation:**
- Add new limit fields to the `SellerProLimits` interface and `FREE_LIMITS`/`PRO_LIMITS` constants
- Gate theme selection in the Store Builder behind Pro (show lock icon + upgrade prompt for non-default themes)
- Gate announcement bar toggle behind Pro in Store Builder
- Gate custom nav link count in seller settings
- Update the `SellerProPage` comparison table to show the new features
- Add inline upgrade prompts (small banner with Crown icon) at each gated feature in the seller dashboard

---

### Technical Details

**Files modified:**
- `src/pages/StorePage.tsx` — Refactor header, remove floating header, simplify banner, extract product grid
- `src/components/store/StoreFloatingHeader.tsx` — Delete
- `src/components/store/StoreProductGrid.tsx` — New extracted component
- `src/components/store/StoreReviews.tsx` — Flatten Card wrappers
- `src/components/store/StoreTrustSignals.tsx` — Increase text size
- `src/hooks/useSellerSubscription.ts` — Add new limit fields
- `src/pages/seller/SellerProPage.tsx` — Add new comparison rows
- `src/pages/seller/SellerStoreBuilder.tsx` — Gate themes and announcement behind Pro

