

# Improving Product Discovery: All Products vs Featured

## Current Problem

The "All Products" (`/products`) and "Featured Products" (`/products?featured=true`) pages are functionally identical - just a filtered product grid. This creates:

- **Poor user experience**: No distinct "curated" feeling for featured items
- **Missed marketing potential**: Featured products deserve premium presentation
- **Navigation confusion**: Multiple paths to similar content

---

## Proposed Solution: Curated Collections System

Transform the "Featured" concept into a proper **Collections** experience, giving Eclipse distinct discovery destinations.

### Option A: Dedicated Featured Page (Recommended)

Create a standalone `/featured` route with a premium, editorial-style layout:

```text
┌─────────────────────────────────────────────────────────┐
│                    STAFF PICKS                          │
│         Hand-selected by the Eclipse team               │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │           HERO FEATURED PRODUCT                   │  │
│  │      (Large showcase with description)            │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Featured Collection (3-4 products in large cards)      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │         │  │         │  │         │  │         │    │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │
│                                                         │
│  ────────────── New This Week ──────────────            │
│  (Products added in last 7 days)                        │
│                                                         │
│  ────────────── Popular Now ──────────────              │
│  (Sorted by download count)                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Benefits:**
- Distinct URL for marketing campaigns (`eclipsestore.com/featured`)
- Premium presentation for curated content
- Combines featured + new + popular in one discovery page

---

### Option B: Collections/Curated Pages

Expand beyond "Featured" to multiple curated experiences:

| Route | Purpose | Content |
|-------|---------|---------|
| `/collections/staff-picks` | Hand-curated by team | Featured products |
| `/collections/new-arrivals` | Discovery for new items | Products from last 7 days |
| `/collections/trending` | Social proof | Top downloaded this month |
| `/collections/on-sale` | Promotions | Discounted products |

---

## Recommended Changes

### 1. New Dedicated Featured Page (`/featured`)

Create `src/pages/Featured.tsx` with:
- Hero section showcasing the #1 featured product
- Curated grid (larger cards than standard grid)
- "New This Week" section
- "Community Favorites" section (most downloaded)
- Editorial copy explaining why these are hand-picked

### 2. Update Navigation

Add "Featured" as a top-level navigation item:

| Current | Proposed |
|---------|----------|
| Products, Categories, Eclipse+ | **Featured**, Products, Categories, Eclipse+ |

Or rename:
- "Products" → "All Products"  
- Add "Staff Picks" in nav

### 3. Remove Redundant Filter

- Remove or repurpose the `?featured=true` query parameter
- Update all links (homepage FeaturedProductsCard, etc.) to point to `/featured`

### 4. Differentiate All Products

Keep `/products` as the comprehensive browsing experience with:
- All sorting options
- Category filtering
- Search
- Pagination

---

## Technical Changes Required

### Files to Create
1. `src/pages/Featured.tsx` - New dedicated featured page

### Files to Modify
1. `src/App.tsx` - Add `/featured` route
2. `src/components/layout/Header.tsx` - Add "Featured" to navigation
3. `src/components/home/FeaturedProducts.tsx` - Update "View All" link to `/featured`
4. `src/components/home/FeaturedProductsCard.tsx` - Update "View all" link to `/featured`
5. `src/pages/Products.tsx` - Remove featured filter logic (optional, can keep for backwards compatibility)

### New Page Structure

The Featured page would include:
- Hero featured product with large image and call-to-action
- Curated selection grid (6-8 products, larger card format)
- "New This Week" horizontal scroll section
- "Popular Picks" section based on downloads
- Consistent Eclipse branding with the "visual restraint" design philosophy

---

## Marketing Benefits

1. **Shareable URL**: `eclipsestore.com/featured` for social media, Discord, emails
2. **Campaign Landing**: Use for promotional campaigns and announcements
3. **SEO Value**: Distinct page can rank for "best Roblox assets" etc.
4. **User Journey**: Clear distinction between "discover curated" vs "browse all"
5. **Content Freshness**: Weekly rotation creates return visits

---

## Questions to Confirm

Before implementation, please confirm:
- Do you prefer Option A (single Featured page) or Option B (multiple Collections)?
- Should "Featured" appear in the main header navigation alongside Products?
- Would you like the hero section to auto-rotate between featured products or show a static "Product of the Week"?

