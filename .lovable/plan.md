

## Roblox-Style Category Restructure

### The Problem

Your community member is right — 15 flat categories with 6 vehicle subtypes as top-level entries is not how Roblox marketplaces work. The reference screenshot (BBBB/similar) shows ~10 clean parent categories with subcategories nested under them.

### Current State (15 flat categories)

```text
Bundle Deals, Maps, Scripts & Systems, Civilian Vehicles,
Marked Police Vehicles, Unmarked Police Vehicles, Ambulance Vehicles,
Fire Vehicles, Military Vehicles, Aircraft, Buildings, Uniforms,
Roblox UI, Roblox Bots, Bots
```

### Target State (10 parent categories + subcategories)

Based on the Discord screenshots and Roblox marketplace conventions:

```text
Parent Category          Subcategories (via parent_id)
─────────────────────    ───────────────────────────────
Maps                     (none — flat)
UIs                      (none — flat)
Scripts & Systems        (none — flat)
Models                   (none — flat, new)
VFXs                     (none — flat, new)
Buildings                (none — flat)
Vehicles                 Civilian, Marked Police, Unmarked Police,
                         Ambulance, Fire, Military
Aircraft                 (none — flat)
Gear                     Uniforms (existing), other gear
Misc                     Bundle Deals, Bots, Roblox Bots, Roblox UI
```

### What Changes

**Phase 1: Database Migration**

One migration that:
1. Creates new parent categories: `Vehicles`, `Models`, `VFXs`, `Gear`, `Misc`
2. Renames `Roblox UI` → re-parents under `Misc` (or merges into `UIs`)
3. Re-parents the 6 vehicle types under the new `Vehicles` parent
4. Re-parents `Uniforms` under `Gear`
5. Re-parents `Bundle Deals`, `Bots`, `Roblox Bots` under `Misc`
6. Updates `display_order` to match the list above
7. All existing `product.category_id` references remain valid — subcategory IDs don't change, only their `parent_id`

**Phase 2: Update CategoryIcons**

- Add new icons: `VehiclesIcon`, `ModelsIcon`, `VFXIcon`, `GearIcon`, `MiscIcon`
- Update `categoryIconMap` with new parent slugs
- Remove orphaned slug entries for promoted-to-child categories

**Phase 3: Update Customer-Facing UI**

- `CustomerSidebar.tsx` — sidebar already renders parent categories from DB; will now show ~10 clean parents instead of 15. Add expandable subcategory support (click parent → shows children inline).
- `CategoriesGrid.tsx` — already queries `parent_id IS NULL`; will automatically show the new 10 parents. Product counts already aggregate children.
- `SearchCategoryChips.tsx` — already filters by `parent_id IS NULL`; auto-fixes.
- `Categories.tsx` — update `CATEGORY_SORT_ORDER` to match new parent slugs.

**Phase 4: Update Seller/Admin Dashboard**

- `SellerProducts.tsx` — already has parent/child grouping in the category Select (lines 960-970). Will automatically show `Vehicles > Civilian`, etc. No code change needed.
- `Products.tsx` (admin) — same pattern, should already work.
- `CategoriesGrid.tsx` in marketplace — update `iconMap` references.

### Files Changed

- **Migration**: Restructure categories table (parent_id + display_order updates)
- **Edit**: `src/components/icons/CategoryIcons.tsx` — add 4 new parent icons + update maps
- **Edit**: `src/pages/Categories.tsx` — update `CATEGORY_SORT_ORDER` for new slugs
- **Edit**: `src/components/layout/CustomerSidebar.tsx` — add expandable subcategory children
- **Edit**: `src/components/marketplace/CategoriesGrid.tsx` — update `iconMap`
- **Edit**: `src/components/marketplace/CategoriesGridCard.tsx` — minor icon map update

### Risk

Low — subcategory IDs stay the same, only `parent_id` changes. All queries already use `category_id` directly. The `Categories.tsx` page already aggregates child counts. Seller product form already renders parent/child hierarchy.

