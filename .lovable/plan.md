

# Marketplace-First Platform Overhaul

## Overview

This plan transforms Eclipse from a hybrid store/marketplace into a **marketplace-first platform** where:
1. The **homepage becomes marketplace-focused** (showing all stores/products equally)
2. **Eclipse Store products are still managed through the admin dashboard** (no change to admin workflow)
3. The **Seller Dashboard remains unchanged** for third-party sellers
4. **Eclipse Store appears as a regular seller store** in the marketplace grid (equal treatment)
5. **Products from all stores display uniformly** without visual distinction

---

## Current State Summary

| Component | Current Behavior |
|-----------|-----------------|
| Homepage (`/`) | Branded hero, Eclipse-centric widgets |
| Marketplace (`/marketplace`) | Eclipse Store featured at top |
| Store Page (`/store/eclipse-store`) | Special category handling via global `categories` table |
| Admin Products | Syncs to Eclipse Store via `ECLIPSE_STORE_ID` constant |
| Product Display | Products without stores treated as Eclipse "main store" products |

---

## Implementation Plan

### Phase 1: Homepage → Marketplace Redirect

**Goal**: Make the marketplace the primary entry point.

**Changes**:
- Update `src/pages/Index.tsx` to redirect users to `/marketplace`
- OR replace the homepage content entirely with the marketplace page content
- Preserve SEO by keeping the same URL structure but with marketplace content

**Option A (Redirect)**:
```text
src/pages/Index.tsx
├── Add useEffect redirect to /marketplace
└── Preserve PWA admin redirect logic
```

**Option B (Replace Content - Recommended)**:
```text
src/pages/Index.tsx
├── Replace HeroSection with marketplace hero
├── Replace other sections with marketplace content
└── Merge best elements of both pages
```

---

### Phase 2: Marketplace Page - Equal Store Treatment

**Goal**: Remove Eclipse Store's special positioning.

**File**: `src/pages/Marketplace.tsx`

**Changes**:
1. Remove the first-store special treatment (lines 414-419 that render Eclipse Store prominently)
2. All stores appear in the same grid with equal sizing
3. Keep the search functionality and store/product filters
4. Update hero text from "Eclipse Main Store" references to "Eclipse Marketplace"

**Current code to modify**:
```text
Lines 414-419:
- Remove: {!isSearching && firstBatchStores.length > 0 && (
    <section>
      <StoreCard store={firstBatchStores[0]} ... />
    </section>
  )}
- Replace with: Include in regular grid
```

---

### Phase 3: Store Page - Remove Special Eclipse Handling

**Goal**: Treat Eclipse Store like any other seller store.

**File**: `src/pages/StorePage.tsx`

**Changes**:
1. Remove `ECLIPSE_STORE_ID` constant (line 138)
2. Remove `isEclipseStore` check (line 139)
3. Remove special category fetching for Eclipse Store (lines 147-155)
4. Use `store_tabs` for ALL stores including Eclipse Store
5. Eclipse Store will need its own `store_tabs` entries created in the database

**Database Migration Required**:
- Create `store_tabs` entries for Eclipse Store based on existing `categories`
- This allows Eclipse Store to work like other seller stores

---

### Phase 4: Product Filtering - Standardize Store Requirement

**Goal**: All displayed products must belong to an active store.

**Files to update**:

1. **`src/pages/Products.tsx`** (line 106-107):
   - Current: `!p.stores || p.stores.is_active !== false`
   - Change to: `p.stores?.is_active === true`

2. **`src/components/home/FeaturedProductsCard.tsx`** (line 92):
   - Current: `!p.stores || p.stores.is_active !== false`
   - Change to: `p.stores?.is_active === true`

3. **`src/components/marketplace/NewArrivalsCard.tsx`** (line ~47):
   - Same filter update

4. **`src/components/search/SearchCommandPalette.tsx`** (line ~109):
   - Same filter update

5. **`supabase/functions/ai-recommendations/index.ts`**:
   - Update all product filtering to require active stores

**Note**: Since Eclipse Store products already have `store_id` set to the Eclipse Store ID, they will continue to appear in results.

---

### Phase 5: Branding Updates

**Goal**: Update all "Eclipse Store" references to "Eclipse Marketplace".

**Files**:
1. `src/components/store/StoreLayout.tsx` - Footer text
2. `src/components/account/ReferralCard.tsx` - Share title
3. `src/components/seller/SellerSettingsNotifications.tsx` - Webhook footers
4. `src/components/marketplace/MarketplaceHeroButton.tsx` - Button text
5. Any notification templates referencing "Eclipse Store"

---

### Phase 6: Admin Dashboard - No Changes Required

The admin products page (`/admin/products`) already works correctly:
- Products sync to Eclipse Store via `ECLIPSE_STORE_ID`
- "Sync to Marketplace" toggle controls `store_id` assignment
- Products appear in Eclipse Store on the marketplace

**No changes needed** - admin workflow remains exactly the same.

---

### Phase 7: Database Migration

**Required Migration**:

```sql
-- Create store_tabs for Eclipse Store based on existing categories
-- This allows Eclipse Store to use the same tab system as other sellers

INSERT INTO store_tabs (store_id, name, slug, icon, display_order, is_active)
SELECT 
  '83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a' as store_id,
  name,
  slug,
  icon,
  display_order,
  true as is_active
FROM categories
WHERE id IN (
  SELECT DISTINCT category_id 
  FROM products 
  WHERE store_id = '83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a'
    AND category_id IS NOT NULL
)
ON CONFLICT DO NOTHING;

-- Link existing Eclipse Store products to their store_tabs
INSERT INTO store_tab_products (tab_id, product_id)
SELECT 
  st.id as tab_id,
  p.id as product_id
FROM products p
JOIN categories c ON p.category_id = c.id
JOIN store_tabs st ON st.store_id = p.store_id AND st.slug = c.slug
WHERE p.store_id = '83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a'
ON CONFLICT DO NOTHING;
```

---

## Summary of Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/Index.tsx` | Major | Replace with marketplace content or redirect |
| `src/pages/Marketplace.tsx` | Medium | Remove Eclipse Store special positioning |
| `src/pages/StorePage.tsx` | Medium | Remove special Eclipse Store handling |
| `src/pages/Products.tsx` | Minor | Update product filter |
| `src/components/home/FeaturedProductsCard.tsx` | Minor | Update product filter |
| `src/components/marketplace/NewArrivalsCard.tsx` | Minor | Update product filter |
| `src/components/search/SearchCommandPalette.tsx` | Minor | Update product filter |
| `src/components/store/StoreLayout.tsx` | Minor | Update footer branding |
| `src/components/account/ReferralCard.tsx` | Minor | Update share text |
| `supabase/functions/ai-recommendations/index.ts` | Minor | Update product filter |
| Database Migration | New | Create store_tabs for Eclipse Store |

---

## What Stays the Same

- **Admin Products Dashboard** - No changes, continues to manage Eclipse Store products
- **Seller Dashboard** - No changes, third-party sellers use their existing workflow
- **Eclipse Store products** - Continue to sync via `ECLIPSE_STORE_ID`
- **Product detail pages** - No changes
- **Checkout/cart** - No changes
- **All seller features** - No changes

---

## Technical Considerations

1. **SEO Impact**: Minimal - marketplace content replaces homepage content at same URL
2. **PWA Caching**: May need cache bust for homepage redirect
3. **Backward Compatibility**: Old `/marketplace` URL continues to work
4. **Admin Workflow**: Zero disruption - products continue syncing to Eclipse Store

