

# Store Builder: Drag-and-Drop Section Editor

## What We're Building

A unified visual store builder at `/seller/store-builder` where sellers can reorder, toggle, and configure their storefront sections via drag-and-drop, with a live preview panel.

## Current State

StorePage.tsx renders sections in a hardcoded order: Banner → Header → Best Sellers → Products → Trust Signals → Custom Sections → Reviews → Recommendations. Sellers have no way to reorder or hide these sections.

## Database Change

Add a `store_layout` JSONB column to `stores`:

```sql
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS store_layout jsonb DEFAULT null;
```

When `null`, StorePage uses the current hardcoded order (backward compatible).

JSON structure:
```json
{
  "sections": [
    { "type": "banner", "visible": true },
    { "type": "header", "visible": true },
    { "type": "best_sellers", "visible": true, "config": { "limit": 4 } },
    { "type": "products", "visible": true },
    { "type": "trust_signals", "visible": true },
    { "type": "custom_sections", "visible": true },
    { "type": "reviews", "visible": true },
    { "type": "recommendations", "visible": true }
  ]
}
```

## New Files

### `src/pages/seller/SellerStoreBuilder.tsx`
- Split-pane layout using `react-resizable-panels` (already installed)
- Left: Sortable section list with `@dnd-kit/core` + `@dnd-kit/sortable`
- Right: Scaled-down live preview using existing store components
- Save button persists `store_layout` JSON to the `stores` table
- Each section row: drag handle, icon, name, visibility toggle (eye icon), click to configure
- When a section is selected, inline settings appear below the list (e.g., Best Sellers limit, Hero text)

### `src/components/seller/builder/SectionList.tsx`
- Renders the draggable list of sections using `@dnd-kit/sortable`
- Each item shows: grip handle, section icon, name, eye toggle

### `src/components/seller/builder/SectionSettings.tsx`
- Contextual settings panel for the selected section type
- Best Sellers: limit slider (2-8)
- Hero/Banner: title, subtitle, CTA text
- Announcement: text, active toggle

### `src/components/seller/builder/BuilderPreview.tsx`
- Renders a scaled (0.5x) preview of the store sections in the configured order
- Uses the same components as StorePage but in a preview container
- Updates reactively as sections are reordered/toggled

## Modified Files

| File | Change |
|------|--------|
| `src/pages/StorePage.tsx` | Read `store_layout` from store query; if present, render sections dynamically in saved order, skip `visible: false` |
| `src/lib/storeColumns.ts` | Add `store_layout` to `PUBLIC_STORE_COLUMNS` |
| `src/components/AppRoutes.tsx` | Add route for `/seller/store-builder` |
| `src/components/seller/SellerSidebar.tsx` | Add "Store Builder" with Sparkles icon as first item in Catalog group |

## How StorePage Changes

The default layout (no active tab) currently renders sections at lines 758-916. With `store_layout`:

```typescript
const DEFAULT_SECTIONS = [
  'banner', 'header', 'best_sellers', 'products', 
  'trust_signals', 'custom_sections', 'reviews', 'recommendations'
];

const layout = store.store_layout?.sections ?? 
  DEFAULT_SECTIONS.map(type => ({ type, visible: true }));

// Render sections in order, skipping invisible ones
{layout.filter(s => s.visible).map(section => {
  switch(section.type) {
    case 'best_sellers': return <StoreBestSellers limit={section.config?.limit ?? 4} />;
    case 'trust_signals': return <StoreTrustSignals />;
    // etc.
  }
})}
```

Banner and Header always render at top (they're structural), but their visibility can be toggled.

## Implementation Order

1. Database migration (add `store_layout` column)
2. Update `storeColumns.ts`
3. Create builder components (SectionList, SectionSettings, BuilderPreview)
4. Create `SellerStoreBuilder.tsx` page
5. Add route and sidebar entry
6. Update `StorePage.tsx` to respect `store_layout`

