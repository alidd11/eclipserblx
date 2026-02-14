
# Declutter Landing Page and Separate Marketplace Browsing

Based on the CEO's feedback, the home page is too crowded. The plan is to remove the featured products grid from the landing page and redesign the marketplace to let users choose between browsing stores or products separately (inspired by the ClearlyDev layout).

---

## Changes Overview

### 1. Remove Featured Products from Landing Page
- Remove the `<LandingFeaturedProducts />` component from `Landing.tsx`
- This immediately declutters the home page, keeping: Hero, Promotions, Categories, Reviews, Trust Signals, and CTA

### 2. Redesign Marketplace Page with Browse Mode Selector
Replace the current mixed layout in `Marketplace.tsx` with a cleaner experience:

- **Marketplace Hero** stays the same (title + search)
- **Browse Mode Toggle** -- two prominent cards/tabs at the top letting users pick:
  - **Browse Stores** -- shows the store grid (current behavior)
  - **Browse Products** -- shows a product-focused grid with filters (category, price, etc.)
- When in "Stores" mode: show Top Stores + store grid (as today, minus the featured products card and other clutter)
- When in "Products" mode: show a clean product grid with the scoring algorithm, horizontal scroll for recent releases (inspired by ClearlyDev screenshot)

### 3. Add Recent Releases Carousel to Marketplace (Products mode)
Inspired by ClearlyDev, add a horizontal scrolling "Recent Releases" section when browsing products, showing the newest products with left/right arrows.

---

## Technical Details

### Files Modified
- **`src/pages/Landing.tsx`** -- Remove `LandingFeaturedProducts` import and usage (2 lines)
- **`src/pages/Marketplace.tsx`** -- Major refactor:
  - Add a `browseMode` state (`'stores' | 'products'`)
  - Add two toggle cards at the top (Store icon + Products icon)
  - Conditionally render store grid vs product grid based on mode
  - Remove `FeaturedProductsCard`, `NewArrivalsCard`, `CategoriesGridCard`, `BecomeSellerCard`, `HowItWorksCard` from the mixed layout when in products mode
  - In products mode: fetch products using the existing scoring hook and display in a clean grid
- **`src/components/marketplace/RecentReleasesCarousel.tsx`** (new) -- Horizontal carousel of newest products with navigation arrows, similar to ClearlyDev's "Recent Releases"
- **`src/components/marketplace/MarketplaceBrowseToggle.tsx`** (new) -- Two-card toggle component for switching between Stores and Products views

### Data Fetching
- Stores mode reuses existing store query
- Products mode uses a new query fetching active products with store info, ordered by `created_at` descending, with category filtering support
