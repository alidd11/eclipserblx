
# Eclipse Competitive UX Overhaul — Implementation Plan

## Priority 1: Product Card Overhaul
**Goal:** Match/exceed ClearlyDev's card information density

Changes to `ProductCard.tsx`:
- Add **star rating** display (average_rating from reviews or product data)
- Add **seller avatar + store name** below the product info
- Add **category badge** overlay on the product image
- Add **"Sale!" badge** for discounted items
- Ensure all of this works on both grid and list views
- Keep the existing hover overlay for desktop

## Priority 2: Sticky Category Bar on Shop Page
**Goal:** 1-click category switching like ClearlyDev's top nav

- Create a `CategoryBar` component with horizontal scrollable icons
- Fetch categories from DB, display with icons
- Sticky position below header on the products/shop page
- Clicking a category filters products instantly
- Works on mobile as horizontal scroll

## Priority 3: Rethink Trust Stats
**Goal:** Stop showing small numbers that hurt credibility

- Replace the current stats bar (if showing raw order/product counts) with **qualitative trust signals**
- Use phrases like "Trusted by Roblox Communities", "Verified Sellers", "Instant Digital Delivery", "Secure Payments"
- Add recognizable trust icons (shield, lock, verified check)
- Only show real numbers when they're impressive

## Priority 4: Product Page Reviews & Ratings
**Goal:** Let buyers see what others think

- Need a `reviews` table (if not exists) with: user_id, product_id, rating (1-5), comment, created_at
- Display reviews on the product detail page
- Show aggregate star rating on product cards
- Allow verified purchasers to leave reviews
- RLS: anyone can read, only verified buyers can write

## Priority 5: General Polish
- Ensure seller info (avatar + name) appears consistently across all product views
- Clean up any "No image" placeholder cards in trending
- Ensure mobile product cards are compact and info-dense

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/ui/ProductCard.tsx` | Major update — ratings, seller info, category badge |
| `src/components/shop/CategoryBar.tsx` | New — sticky category navigation |
| `src/pages/Products.tsx` | Modify — integrate CategoryBar |
| `src/components/landing/TrustBar.tsx` | Modify — qualitative signals instead of raw numbers |
| `src/components/product/ProductReviews.tsx` | New — reviews display + form |
| DB migration | `reviews` table + RLS policies |

## Approach
- DB migration first (reviews table)
- Then all frontend changes in parallel
- No business logic changes — pure UX improvements
