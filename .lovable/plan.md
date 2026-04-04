

## Eclipse v3.0 — Next Round of Improvements

Here are the most impactful improvements we can make right now, grouped by priority.

---

### 1. Mobile Tab Bar Polish
**What**: The bottom tab bar currently uses `bg-background/95 backdrop-blur-md` which can feel translucent and floaty. The Cart tab has an oversized floating treatment (`-mt-4`, `h-12 w-12`) that adds visual noise.
**Change**: Make the tab bar fully solid (`bg-background border-t border-border`), remove the elevated Cart icon treatment so all 5 tabs sit at the same level, and tighten the overall height from `h-16` to `h-14`.

### 2. Category Quick-Nav — Active State + Scrollbar
**What**: The category pills have no visual indication of which category is currently active, and no scroll affordance on mobile.
**Change**: Add an active/selected state (filled background, primary text) based on the current URL params, and add a subtle gradient fade on the right edge to hint at scrollability.

### 3. Product Detail — Mobile Buy Section Sticky
**What**: On mobile, the "Add to Cart" button is buried mid-page. Users have to scroll back up to purchase.
**Change**: Add a compact sticky bottom bar on mobile (above the tab bar) showing the product name, price, and "Add to Cart" button — only visible when the main CTA scrolls out of view.

### 4. Product Card — Wishlist Always Visible on Mobile
**What**: The wishlist heart icon only appears on hover (`opacity-0 group-hover:opacity-100`), which means it's invisible on touch devices.
**Change**: Make the wishlist button always visible on mobile (`md:opacity-0 md:group-hover:opacity-100`), with a subtle semi-transparent background circle.

### 5. Auth Page — Input Focus & Error States
**What**: The auth form inputs lack prominent focus rings and error states could be clearer.
**Change**: Add a visible `ring-2 ring-primary/40` focus state on inputs, and show inline error messages with a red left-border accent for better scannability.

### 6. Account Page — Collapsible Sections
**What**: The account page is a long vertical scroll of navigation rows and cards. On mobile it feels like an endless list.
**Change**: Group related NavRows under collapsible sections (Shopping, Settings, Preferences) that default to expanded but can be collapsed to reduce cognitive load.

### 7. Section Headers — Consistent Pattern
**What**: Each homepage section (Trending, Recent Releases, On Sale, Free Assets) has slightly different header styling and spacing.
**Change**: Create a shared `SectionHeader` component with consistent icon container, title size, item count badge, and "View all" link pattern. Apply across all homepage sections.

---

### Technical Details

| Improvement | Files | Complexity |
|---|---|---|
| Tab bar polish | `MobileTabBar.tsx` | Small |
| Category active state | `CategoryQuickNav.tsx` | Small |
| Sticky buy bar | `ProductDetail.tsx` + new `StickyBuyBar.tsx` | Medium |
| Wishlist mobile visibility | `ProductCard.tsx` | Tiny |
| Auth input focus | `Auth.tsx` or global CSS | Small |
| Account collapsibles | `Account.tsx` | Medium |
| Section header component | New `SectionHeader.tsx` + update 5-6 sections | Medium |

All changes are visual/UX only — no business logic or data flow changes.

