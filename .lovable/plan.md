

# Multi-Step Navigation with Country Selection (Including Uniforms)

## Overview

This plan implements a new navigation flow where clicking on vehicle or uniform categories takes users to an intermediate **Country Selection page** displaying flags. Selecting a country then navigates to the products filtered by both type and region.

---

## User Flow

```text
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Categories Page   │     │  Country Selection  │     │   Products Page     │
│                     │     │                     │     │                     │
│  [Civilian Vehicles]│────▶│   🇬🇧  🇺🇸  🇪🇺       │────▶│  US Civilian Vehicles│
│  [Police Vehicles]  │     │   UK  US  EU        │     │  [Product Cards...]  │
│  [Uniforms]         │     │                     │     │                     │
│  [Fire Vehicles]    │     │                     │     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

---

## Categories Getting Multi-Step Flow

| Category | Regional Sub-Categories |
|----------|------------------------|
| Civilian Vehicles | UK, US, EU Civilian Vehicles |
| Marked Police Vehicles | UK, US, EU Police Vehicles |
| Unmarked Police Vehicles | UK, US, EU Unmarked Police |
| Fire Vehicles | UK, US, EU Fire Vehicles |
| Ambulance Vehicles | UK, US, EU Ambulance Vehicles |
| Military Vehicles | UK, US, EU Military Vehicles |
| Aircraft | UK, US, EU Aircraft |
| **Uniforms** | **UK, US, EU Uniforms** |

**Categories staying direct-link (no country selection):**
- Maps
- Bundle Deals
- Bots
- Buildings

---

## Implementation Steps

### Phase 1: Database Changes

1. Add `parent_category_id` column to `categories` table
2. Insert 24 regional sub-categories (8 parent categories × 3 regions)

**New Sub-Categories for Uniforms:**
| Name | Slug | Description |
|------|------|-------------|
| UK Uniforms | `uk-uniforms` | British police, fire, and EMS uniforms |
| US Uniforms | `us-uniforms` | American law enforcement and emergency uniforms |
| EU Uniforms | `eu-uniforms` | European service uniforms |

### Phase 2: Create Country Selection Page

**New File:** `src/pages/RegionSelect.tsx`

**URL Pattern:** `/browse/:categorySlug/region`

**Features:**
- Display the parent category name (e.g., "Uniforms")
- Show three clickable country cards with flag emojis and item counts
- Animated hover effects matching existing design
- "View All Regions" option
- Back navigation breadcrumb

### Phase 3: Update Routing

**Add to `App.tsx`:**
```text
/browse/:categorySlug/region → RegionSelect page
```

**Navigation flow:**
- User clicks "Uniforms" → Goes to `/browse/uniforms/region`
- User clicks 🇺🇸 → Goes to `/products?category=us-uniforms`

### Phase 4: Update Category Links

Modify `Categories.tsx` to check if a category has regional sub-categories:
- If yes → Link to `/browse/{slug}/region`
- If no → Link directly to `/products?category={slug}`

### Phase 5: UI Enhancements

Update `CategoriesGridCard.tsx` icon mapping:
```text
🇬🇧 for uk-* slugs
🇺🇸 for us-* slugs  
🇪🇺 for eu-* slugs
```

---

## Visual Design

### Country Selection Page

```text
┌──────────────────────────────────────────────────────┐
│  ← Back to Categories                                │
│                                                      │
│              Select Your Region                      │
│                 Uniforms                             │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │              │  │              │  │              ││
│  │     🇬🇧      │  │     🇺🇸      │  │     🇪🇺      ││
│  │              │  │              │  │              ││
│  │    United    │  │    United    │  │   European   ││
│  │   Kingdom    │  │    States    │  │    Union     ││
│  │              │  │              │  │              ││
│  │   12 items   │  │   8 items    │  │   15 items   ││
│  └──────────────┘  └──────────────┘  └──────────────┘│
│                                                      │
│              [ View All Regions ]                    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Technical Summary

### Database Migration

```sql
-- Add parent category support
ALTER TABLE categories ADD COLUMN parent_category_id UUID REFERENCES categories(id);

-- Insert all 24 regional sub-categories
-- Vehicles (7 types × 3 regions = 21)
-- Uniforms (1 type × 3 regions = 3)
```

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/RegionSelect.tsx` | Create | Country selection page |
| `src/App.tsx` | Modify | Add route `/browse/:categorySlug/region` |
| `src/pages/Categories.tsx` | Modify | Update links for categories with sub-categories |
| `src/components/marketplace/CategoriesGridCard.tsx` | Modify | Add flag emoji icons |
| Database migration | Execute | Add schema and 24 sub-categories |

---

## Summary

This creates an intuitive two-step browsing experience for region-specific products:

1. **8 parent categories** get the country selection flow (7 vehicle types + Uniforms)
2. **4 categories** remain direct-link (Maps, Bundle Deals, Bots, Buildings)
3. **24 new sub-categories** for UK/US/EU variants
4. Product counts shown on each flag card for better UX

