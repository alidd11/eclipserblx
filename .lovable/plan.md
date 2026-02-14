

# Merge Marketplace into the Home Page

Remove the separate `/marketplace` page and bring its content (browse toggle, store grid, product grid, recent releases) directly into the home page beneath the existing landing hero.

---

## What Changes

### 1. Combine Landing + Marketplace on `/`
The home page will show:
1. **Landing Hero** (kept as-is -- headline, CTAs, popular searches, active offers)
2. **Promotion Carousel** (kept as-is)
3. **Browse Toggle** (Stores / Products) -- moved from Marketplace
4. **Stores mode**: Top Stores + store grid
5. **Products mode**: Recent Releases carousel + Featured Products grid
6. **Landing Categories, Reviews, Trust Signals, CTA** -- kept below

### 2. Remove `/marketplace` Route
- Remove the `/marketplace` route from `AppRoutes.tsx`
- Add a redirect: `/marketplace` -> `/` so any existing links/bookmarks still work
- Remove the lazy import for Marketplace

### 3. Update All `/marketplace` Links to `/`
Update links in these files:
- `MarketplaceHeroButton.tsx` -> `/`
- `LandingHero.tsx` -> `/`
- `LandingCTA.tsx` -> `/`
- `PWALandingHero.tsx` -> `/`
- `MarketplaceBreadcrumb.tsx` -> `/`
- `StoreSidebar.tsx` -> `/`
- `CustomerSidebar.tsx` -> `/`
- Discord bot URL stays as external link (will redirect)

---

## Technical Details

### Files Modified

- **`src/pages/Landing.tsx`** -- Import and render the marketplace components (browse toggle, store/product grids, search, top stores, recent releases) between the PromotionCarousel and LandingCategories sections. Move the relevant logic (store queries, browse mode state, search) into this page or extract into a new `MarketplaceSection` component.

- **`src/components/AppRoutes.tsx`** -- Remove the Marketplace lazy import and route. Add `<Route path="/marketplace" element={<Navigate to="/" replace />} />` for backwards compatibility.

- **`src/pages/Index.tsx`** -- No changes needed (already renders Landing).

- **`src/components/marketplace/MarketplaceHeroButton.tsx`** -- Change link from `/marketplace` to `/`
- **`src/components/landing/LandingHero.tsx`** -- Change `/marketplace` links to `/`
- **`src/components/landing/LandingCTA.tsx`** -- Change `/marketplace` links to `/`
- **`src/components/landing/PWALandingHero.tsx`** -- Change `/marketplace` link to `/`
- **`src/components/store/MarketplaceBreadcrumb.tsx`** -- Change `/marketplace` links to `/`
- **`src/components/store/StoreSidebar.tsx`** -- Change `/marketplace` link to `/`
- **`src/components/layout/CustomerSidebar.tsx`** -- Change `/marketplace` href to `/`

### New Component (optional, for cleanliness)
- **`src/components/home/MarketplaceSection.tsx`** -- Extracts the store grid, product grid, browse toggle, search bar, and data fetching logic from `Marketplace.tsx` into a reusable section component that gets embedded in `Landing.tsx`. This keeps Landing.tsx clean rather than dumping 200+ lines of marketplace logic into it.

### What Happens to `src/pages/Marketplace.tsx`
- Kept in the codebase but no longer routed to directly
- Its logic is either imported via the new `MarketplaceSection` component or inlined into Landing

