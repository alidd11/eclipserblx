
## Restructure Seller Categories to Show Hierarchical Parent/Sub-Category Layout

### Overview
Update the seller-side category experience to display categories in a hierarchical parent/sub-category structure (like ClearlyDev), instead of the current flat list. This affects three areas: the category management page, the store sections page, and the product form's category picker.

### Changes

#### 1. SellerCategories page (`/seller/categories`) - Hierarchical toggle list
Currently shows a flat 2-column grid of all categories with toggle switches. Will be restructured to:
- Display parent categories as expandable rows (accordion-style, matching the landing page pattern)
- Nest sub-categories underneath their parent with indentation
- Toggling a parent category enables/disables all its children
- Each sub-category can also be individually toggled
- Clean vertical list layout instead of grid

#### 2. Product form category selector (in `SellerProducts.tsx`)
Currently a flat `<Select>` dropdown listing every category alphabetically. Will be updated to:
- Group options by parent category using `<SelectGroup>` with `<SelectLabel>` headers
- Show parent categories as group headers (non-selectable if they have children)
- Show sub-categories indented under their parent group
- Categories without children remain directly selectable

#### 3. SellerStoreTabs page (`/seller/tabs`) - Minor alignment
- No structural changes needed here as these are custom store sections, not marketplace categories
- Rename sidebar label from "Store Sections" to something clearer if needed

### Technical Details

**SellerCategories.tsx:**
- Modify the categories query to fetch all categories with `parent_id` field
- Separate into `parentCategories` (where `parent_id` is null) and child lookup (grouped by `parent_id`)
- Replace the 2-column grid with a vertical accordion list using expandable rows (same pattern as `LandingCategories`)
- Add `useState` for expanded parent tracking
- Use `framer-motion` `AnimatePresence` for expand/collapse animation
- Add "toggle all children" logic when parent switch is toggled

**SellerProducts.tsx (category selector):**
- Update the categories query to include `parent_id` field
- Separate parent vs child categories
- Render `<SelectGroup>` per parent with `<SelectLabel>` for the parent name
- Render child categories as `<SelectItem>` within each group
- Standalone categories (no children, no parent) render as top-level `<SelectItem>`

**No database changes required** - the `parent_id` column already exists and is populated.

### Files to modify
- `src/pages/seller/SellerCategories.tsx` - Full redesign to hierarchical accordion layout
- `src/pages/seller/SellerProducts.tsx` - Update category `<Select>` to grouped hierarchy
