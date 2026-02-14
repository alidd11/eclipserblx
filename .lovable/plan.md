

## Redesign Categories Page with Expandable Sub-Categories

Replace the current two-page flow (Categories grid -> separate Region Select page) with a single-page accordion-style layout where parent categories expand inline to reveal their sub-categories (UK/US/EU regions).

### What Changes

**1. Redesign `/categories` page with accordion pattern**
- Parent categories that have sub-categories (Civilian Vehicles, Marked Police, etc.) will be expandable rows
- Clicking them expands to show sub-category options (UK, US, EU) inline with flag images
- Parent categories without sub-categories (Maps, Bundle Deals, Bots, Buildings) link directly to products as they do now
- Each row shows the category image/icon, name, and total product count
- Expanded state shows sub-categories in a horizontal row with flag images and per-region counts

**2. Remove the Region Select page and route**
- Delete `src/pages/RegionSelect.tsx`
- Remove the `/browse/:categorySlug/region` route from `AppRoutes.tsx`
- All region selection now happens inline on the categories page

**3. Update data fetching**
- Fetch both parent categories and their sub-categories in a single query on the categories page
- Include product counts for each sub-category
- Group sub-categories under their parent for rendering

### Visual Layout

```text
+------------------------------------------+
|             CATEGORIES                    |
+------------------------------------------+
| [Civilian Vehicles]  [img]    12 items  v |
|   +-- UK Civilian [flag]  5 items        |
|   +-- US Civilian [flag]  4 items        |
|   +-- EU Civilian [flag]  3 items        |
|                                           |
| [Marked Police]      [img]     8 items  > |
| [Maps]               [img]     3 items  > |
| [Bots]               [img]     2 items  > |
+------------------------------------------+
```

Categories without sub-categories navigate directly. Categories with sub-categories use the Radix accordion to expand/collapse.

### Technical Details

**Files to modify:**
- `src/pages/Categories.tsx` -- Complete redesign to use accordion layout with inline sub-categories. Fetch sub-categories alongside parents. Use existing region flag images from `src/assets/regions/`. Use the existing `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` components from the UI library.
- `src/components/AppRoutes.tsx` -- Remove the `/browse/:categorySlug/region` route and lazy import for `RegionSelect`.

**Files to delete:**
- `src/pages/RegionSelect.tsx`

**Styling approach:**
- Follows the existing utilitarian dark aesthetic (solid surfaces, no gradients/glow)
- Uses existing category images as small thumbnails in each row
- Sub-categories display region flag images from `src/assets/regions/` in a compact horizontal layout
- Accordion animation uses existing Radix accordion components already in the project

