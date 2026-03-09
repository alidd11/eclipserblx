

# Plan: Isolate Custom Domain Stores from Main Eclipse Site

## Problem
When a store is accessed via a custom domain (e.g., `mystore.eclipserblx.com` or `mystore.com`), the full Eclipse navigation, sidebar links, header, footer, breadcrumbs, and search all link back to the main Eclipse marketplace. This breaks the standalone store experience.

## Key Areas to Fix

### 1. StoreSidebar — Remove "Marketplace" link and irrelevant nav groups
- **Line 124**: `{ title: 'Marketplace', icon: ChevronLeft, href: '/' }` — links to Eclipse home
- **Lines 130-139**: "My Account" group links to `/account`, `/wishlist`, `/purchases` — these are Eclipse platform pages
- **Lines 155-163**: "Legal" group links to Eclipse legal pages
- The sidebar should be aware of `isCustomStoreDomain` and hide/modify these groups

### 2. Header — Eclipse branding and nav links
- **Line 112**: Logo links to `/` (Eclipse home)
- **Lines 23-29**: Nav links (Featured, Products, Categories, Eclipse+, Jobs) — all Eclipse marketplace pages
- **Lines 119**: Search bar searches the full marketplace
- On custom domains: hide main nav, make logo link to store root, hide marketplace search or scope it to the store

### 3. Footer — Links to Eclipse pages
- All footer links go to Eclipse pages (`/products`, `/categories`, `/support`, `/terms`, etc.)
- On custom domains: either hide the footer entirely or show a minimal store-specific footer

### 4. UniversalBreadcrumb — Home links to Eclipse
- Breadcrumb "Home" crumb links to `/` which is Eclipse home
- On custom domains: Home should link to the store root

### 5. StoreStandalonePage — "Powered by Eclipse" badge is fine (keep it)
- The badge at bottom-right linking to eclipserblx.com is acceptable branding

### 6. StructuredData/SEO — Hardcoded eclipserblx.com URLs
- `StorePage.tsx` line 386: SEO url hardcoded to `eclipserblx.com`
- `StructuredData.tsx`: Multiple hardcoded Eclipse URLs
- On custom domains: use `window.location.origin` instead

## Implementation Approach

1. **Add `isCustomStoreDomain` to the `useStoreDomain` hook** (already exposed) and consume it in the affected components.

2. **Header.tsx** — Accept an optional `isStandaloneDomain` prop (or read from `useStoreDomain`):
   - Hide main nav links (Featured, Products, Categories, etc.)
   - Make logo link to store root (`/store/{slug}`) instead of `/`
   - Hide or scope the search bar to the current store only
   - Keep cart, auth, and notification icons

3. **StoreSidebar.tsx** — When `isCustomStoreDomain`:
   - Remove "Marketplace" link from Quick Access
   - Remove or hide "My Account" group (Profile, Wishlist, Purchases link to Eclipse pages that won't exist on the custom domain route)
   - Remove "Legal" group (or rewrite to point to store-specific or external legal pages)
   - Keep Store Home, About, Browse sections

4. **Footer.tsx** — When `isCustomStoreDomain`:
   - Show a minimal footer with just copyright and "Powered by Eclipse" link
   - Remove all Eclipse-specific nav columns

5. **UniversalBreadcrumb.tsx** — When `isCustomStoreDomain`:
   - Make "Home" link to the store root, not `/`

6. **StorePage.tsx / StructuredData.tsx** — When on custom domain:
   - Use `window.location.origin` for canonical URLs and structured data instead of hardcoded `eclipserblx.com`

7. **StoreRecommendations** — Hide or keep but ensure links stay within the custom domain routes (they should already work since product links are relative `/products/:slug`)

## Files to Modify
- `src/components/layout/Header.tsx`
- `src/components/store/StoreSidebar.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/layout/UniversalBreadcrumb.tsx`
- `src/pages/StorePage.tsx`
- `src/components/seo/StructuredData.tsx`
- `src/hooks/useStoreDomain.tsx` (no changes needed, already exports `isCustomStoreDomain`)

