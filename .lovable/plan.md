

# Store Builder — Enhancements

## Current State

The store builder already has working **drag-and-drop reordering**, **visibility toggles**, and a **basic wireframe preview**. The `StorePage.tsx` correctly reads `store_layout` and renders sections in the saved order. However, there are gaps worth closing:

## What to Build

### 1. Announcement Bar — Wire Up to StorePage
The builder supports configuring an announcement section (text + active toggle), but `StorePage.tsx` never renders it. We need to:
- Read the announcement config from `store_layout.sections` in `StorePage.tsx`
- Render a dismissible announcement bar at the top of the store when `announcement` is visible and `config.active === true`
- Style it with the store's accent color

### 2. Richer Live Preview
Replace the current placeholder blocks with more realistic miniature representations:
- **Banner**: Show a gradient placeholder with the store name overlay
- **Header**: Show avatar circle + store name + follower count mock
- **Best Sellers**: Show small product card placeholders (grid of 2-4 based on config.limit)
- **Products**: Show a grid of product card skeletons
- **Announcement**: Show the actual announcement text from config, or placeholder if empty
- **Reviews**: Show star rating mock
- **Trust Signals**: Show shield + badge icons inline

This makes the preview feel like an actual storefront miniature rather than labeled boxes.

### 3. Section Highlight Sync
When a section is selected in the side panel, highlight its corresponding block in the preview with a ring/outline so sellers can visually map sidebar items to preview blocks.

## Technical Approach

- **StorePage.tsx**: Add `announcement` case to the section switch (~15 lines). Render a colored bar with the text from `section.config.text`.
- **BuilderPreview.tsx**: Replace the generic icon+label blocks with section-specific mini renderers. Add `selectedId` prop and apply a highlight ring to the matching section.
- **SellerStoreBuilder.tsx**: Pass `selectedId` to `BuilderPreview`.
- **No database changes needed** — announcement config is already stored in the `store_layout` JSONB.

## Files to Change

| File | Change |
|------|--------|
| `src/components/seller/builder/BuilderPreview.tsx` | Richer section previews + highlight sync |
| `src/pages/seller/SellerStoreBuilder.tsx` | Pass `selectedId` to preview |
| `src/pages/StorePage.tsx` | Render announcement bar from layout config |

