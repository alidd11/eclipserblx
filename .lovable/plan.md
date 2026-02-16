

# Optimize the Categories Tab

## Current Issues
- Shows all 12 categories equally, but only 4 have products (Maps: 4, Bundle Deals: 13, Bots: 2, Buildings: 5). The other 8 are empty.
- Simple flat list with small icons -- no visual hierarchy or product previews to entice clicks.
- No product counts shown, so users click into empty categories blindly.
- The full `/categories` page already has rich cards with product thumbnails, but the home tab doesn't leverage any of that.

## Proposed Changes

### 1. Show product counts on each category
Add a small count badge (e.g. "13 products") next to each category name so users know what's available.

### 2. Prioritize categories with products
Sort categories so those with actual products appear first. Empty categories get grouped at the bottom with a dimmed/muted style.

### 3. Add product thumbnail previews for populated categories
For categories that have products, show 2-3 small product thumbnails inline (similar to the full Categories page), making the grid more visual and engaging.

### 4. Single query with counts
Replace the current simple query with one that also fetches product counts and a couple of top product images per category -- all in a single pass instead of the N+1 pattern used in the full Categories page.

## Technical Details

**File: `src/components/marketplace/CategoriesGrid.tsx`**

- Update the query to fetch product counts and top 3 product images per category using a combined approach (fetch categories, then batch-fetch top products for all category IDs in one query).
- Sort results: categories with products first (by count descending), empty ones last.
- Restyle each category card:
  - Categories **with products**: show icon, name, count badge, and a row of 2-3 small product thumbnail squares.
  - Categories **without products**: render in a compact, muted row at the bottom with a "Coming soon" label.
- Remove the framer-motion stagger animation (unnecessary overhead for a small grid).
- Keep the "View all" link to `/categories` for the full experience.

