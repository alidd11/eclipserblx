

# Unified Visual Design System

## Problem Analysis

After analyzing the codebase, I identified several visual inconsistencies across different sections of the platform:

### Current Inconsistencies

| Area | Issue |
|------|-------|
| **Store Layout vs Main Layout** | Store pages use a completely separate header design without the main Eclipse branding and search bar |
| **Sidebar Styling** | Three different sidebar implementations: `CustomerSidebar`, `StoreSidebar`, and `SellerSidebar` with varying padding, typography, and structure |
| **Header Heights** | Main header is `h-14 sm:h-16` but StoreLayout header is `h-12 xs:h-14` |
| **Footer Variations** | Main `Footer` component differs from the inline store footer in `StoreLayout` |
| **Breadcrumb Placement** | Only store pages have breadcrumbs; main site lacks contextual navigation |
| **Landing Page** | Uses different spacing, typography scales, and animation patterns than the rest of the site |
| **Category Cards** | Landing page uses gradient-heavy cards while marketplace uses subdued card styling |
| **Search Experience** | Main site has the command palette search; store pages lack integrated search |

---

## Proposed Unified Design System

### 1. Universal Header Component
Replace the custom store header with the shared `Header` component (already done for SellerLayout).

**Changes:**
- `StoreLayout.tsx`: Replace custom header with `<Header />` component
- Add store context badge/indicator within the main header
- Ensure search functionality works across all pages

### 2. Synchronized Sidebar Structure
Align all three sidebars to share the same visual DNA:

**Standardized Properties:**
- Same padding: `p-3` for content, `p-4` for headers
- Same nav item heights: `h-9` with `gap-2`
- Same icon sizing: `h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]`
- Same typography: section labels as `text-xs font-medium uppercase tracking-wider`
- Same active state: `bg-primary text-primary-foreground`

**Changes:**
- `StoreSidebar.tsx`: Adopt `CustomerSidebar` styling patterns
- Add consistent Eclipse branding footer to all sidebars

### 3. Unified Footer Component
Use the main `Footer` component everywhere instead of inline footers.

**Changes:**
- `StoreLayout.tsx`: Replace inline footer with `<Footer />` component
- Add optional store attribution line to Footer

### 4. Consistent Spacing System
Standardize container and section spacing across all pages.

**Pattern:**
```text
Section padding: py-16 sm:py-20
Container: container mx-auto px-4
Card gaps: gap-4 sm:gap-6
Grid gaps: gap-4 sm:gap-6
```

**Changes:**
- Landing page sections: Align with marketplace spacing
- Store pages: Use consistent container widths

### 5. Landing Page Visual Alignment
Reduce visual disparity between landing page and marketplace.

**Changes:**
- `LandingCategories.tsx`: Use card styling that matches marketplace cards (border-border, bg-card)
- `LandingFeaturedProducts.tsx`: Use the shared `ProductCard` component instead of custom inline cards
- Reduce hero background complexity for a cleaner look
- Align CTA button styles with standard Button components

### 6. Universal Breadcrumb System
Add contextual breadcrumbs throughout the site, not just on store pages.

**New Component:**
- Create `UniversalBreadcrumb.tsx` for main site navigation
- Pattern: `Eclipse > [Section] > [Subsection]`

**Integration:**
- Add to `MainLayout.tsx` below header
- Automatically generate from current route

### 7. Search Integration Everywhere
Ensure the search command palette is accessible from all layouts.

**Changes:**
- `StoreLayout.tsx`: Add `SearchCommandProvider` wrapper
- Add search trigger to store header

---

## Technical Implementation Details

### Files to Create
```
src/components/layout/UniversalBreadcrumb.tsx - Route-based breadcrumb component
```

### Files to Modify

**High Priority (Core Layout Unification):**
```
src/components/store/StoreLayout.tsx
  - Import and use shared Header component
  - Import and use shared Footer component
  - Wrap with SearchCommandProvider
  - Remove custom header implementation
  - Remove inline footer

src/components/store/StoreSidebar.tsx
  - Align padding to CustomerSidebar pattern
  - Add Eclipse branding in footer
  - Standardize nav item styling
  - Update typography scale
```

**Medium Priority (Visual Consistency):**
```
src/components/landing/LandingCategories.tsx
  - Replace gradient cards with consistent card styling
  - Reduce heavy visual effects

src/components/landing/LandingFeaturedProducts.tsx
  - Replace custom ProductCard with shared component
  - Standardize card hover effects

src/components/landing/LandingHero.tsx
  - Tone down background gradients
  - Align button styling
```

**Lower Priority (Enhancements):**
```
src/components/layout/MainLayout.tsx
  - Add UniversalBreadcrumb below header

src/components/layout/Footer.tsx
  - Add optional store context line
```

---

## Visual Before/After Comparison

### Store Pages
```text
BEFORE:
  Custom header with different height (h-12)
  Store-specific social icons
  Separate breadcrumb bar
  Inline footer with different styling
  No search integration

AFTER:
  Shared Header component (h-14 sm:h-16)
  Store badge in unified header
  Integrated breadcrumbs
  Shared Footer component
  Command palette search available
```

### Sidebars
```text
BEFORE:
  CustomerSidebar: Collapsible groups, notification dots
  StoreSidebar: Flat list, accent colors
  SellerSidebar: Collapsible groups, different spacing

AFTER:
  Unified structure across all three
  Same padding, typography, and spacing
  Consistent active/hover states
  Eclipse branding footer on all
```

### Landing vs Marketplace
```text
BEFORE:
  Landing: Gradient category cards, custom product cards
  Marketplace: Subdued cards, shared ProductCard

AFTER:
  Both use consistent card styling
  Shared ProductCard component everywhere
  Unified hover effects and shadows
```

---

## Implementation Status

✅ **Completed:**
1. **Store Layout Unification** - Replaced custom header/footer with shared Header/Footer components, added SearchCommandProvider
2. **Sidebar Standardization** - Aligned StoreSidebar with CustomerSidebar patterns, added Eclipse branding footer
3. **Landing Page Refinement** - Updated category cards to use consistent bg-card styling, simplified hero gradients
4. **Breadcrumb System** - Created UniversalBreadcrumb for main site, enhanced MarketplaceBreadcrumb with compact mode

---

## Design Tokens Preserved

The existing CSS custom properties and Tailwind configuration will be maintained:
- Color system: primary, secondary, muted, accent
- Typography: font-display (Orbitron), font-sans (Inter)
- Spacing: Tailwind defaults
- Border radius: var(--radius)
- Shadows: Standard Tailwind shadows

This ensures the gaming aesthetic is preserved while achieving visual consistency.


