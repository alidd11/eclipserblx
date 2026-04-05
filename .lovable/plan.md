

## Enterprise-Level Product Page Improvements

The current product page works but has several areas that feel rough compared to enterprise marketplaces (Shopify product pages, Gumroad, Steam). Here are the key improvements:

### 1. Tighter Layout & Visual Hierarchy
- Remove excessive `space-y-6` gaps between sections — tighten to `space-y-4`
- Close the disconnected grid layout — on desktop, the right column (details card, share/report section) should feel like one cohesive unit, not separate floating cards
- Merge the "Share + Price Alert + Report" card into the main details card as a subtle divider row instead of a separate bordered container

### 2. Reviews Section — Cleaner, Denser
- Replace the heavy `Card` wrapper with a simple section divider (just a `border-t` and heading)
- Make review avatars smaller (32px instead of 40px)
- Tighten review item spacing
- Move the "Write a Review" button inline next to the review count instead of in a card header

### 3. Related Products — Consistent Card Style
- The related products section uses `aspect-video` and `object-cover` while other product grids use `aspect-square` and `object-contain` — standardize to square/contain
- Use `formatPrice()` instead of hardcoded `£${p.price.toFixed(2)}`
- Remove the heavy `Card` wrapper — use a simple section with `SectionHeader`-style heading

### 4. Bottom Sections — Streamlined Order
- Reorder: Related Products → Frequently Bought Together → Sponsored → Recently Viewed
- Currently Related Products sits inside the grid container but the others sit outside — unify them all into the same flow
- Remove the extra `Card` wrapper from Related Products to match the flat style of FrequentlyBoughtTogether

### 5. Action Buttons — More Polished
- The "View Cart" button after adding to cart has `h-14` (56px) while the main CTA is `h-12` — normalize both to `h-12`
- Consolidate the share/report/price-alert actions into a compact inline row with icon-only buttons + tooltips instead of full-width bordered buttons

### Files Changed
- **`src/pages/ProductDetail.tsx`** — Tighten spacing, merge action row into details card, flatten reviews section, standardize related products grid, fix button heights, reorder bottom sections
- **`src/components/product/StoreDetailsCard.tsx`** — Minor: remove bottom accent line (unnecessary visual noise)

### Technical Details
- Replace `<Card>` wrappers on Reviews and Related Products with simple `<section>` elements with `border-t border-border pt-6` dividers
- Move the share/report/price-alert row (lines 812-837) inside the main details `<Card>` (after the CTA buttons) as a `border-t` divider section
- Standardize related product cards to use `aspect-square object-contain` and `formatPrice()`
- Fix "View Cart" button from `h-14` to `h-12`

