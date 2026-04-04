

# Fix Desktop Layout & Clean Up Eclipse+ Remnants

## Problems Identified

1. **Eclipse+ remnants still present** — The hero CTA still links to `/eclipse-plus`, the Header nav still includes an Eclipse+ link, and the hero text says "Eclipse+". These need removing since Eclipse+ was deleted.

2. **Desktop layout uses sidebar + narrow content** — The `LayoutShell` renders a `CustomerSidebar` on desktop (`hidden md:flex`), pushing main content into a smaller column. On the reference screenshots, the site is full-width with the header spanning the entire viewport. The sidebar is appropriate for mobile drawer but on desktop it constrains the homepage.

3. **Header missing key desktop elements** — The desktop header row exists but `showDesktopNav` is set to `false` in LayoutShell, hiding the text nav links. The search bar, currency selector, and Discord button are present but get squeezed next to the sidebar.

4. **Category bar container is narrow** — `GlobalCategoryBar` uses `<div className="container">` which constrains width. On the reference screenshots it spans full width.

5. **Product grid columns** — Desktop grid uses `lg:grid-cols-4` which matches the reference. This is fine.

---

## Plan

### 1. Remove remaining Eclipse+ references
- **LandingHero.tsx**: Remove the Eclipse+ CTA link (lines 103-109)
- **Header.tsx**: Remove the `/eclipse-plus` nav link from `navLinkDefs` (line 28)

### 2. Fix desktop layout — hide sidebar on homepage
The homepage should be full-width on desktop (no sidebar), matching the reference screenshots. The sidebar should only appear as a mobile drawer.

- **MainLayout.tsx**: Hide the desktop sidebar on the landing page. Two approaches:
  - Option A: Add a prop `hideDesktopSidebar` to LayoutShell and pass it from MainLayout when on the homepage
  - Option B (simpler): Change the desktop sidebar from `hidden md:flex` to always hidden, since the header + category bar provides all navigation on desktop

Since the reference screenshots show NO sidebar on desktop for any page, we'll hide the desktop sidebar entirely and rely on the header nav + category bar for desktop navigation.

- **LayoutShell.tsx**: Change `<div className="hidden md:flex">` to `<div className="hidden">` (or remove desktop sidebar rendering entirely)
- **Header.tsx**: Set `showDesktopNav` back to working state — the desktop header already has search, Discord, cart, account icons. Ensure it spans full width.

### 3. Fix header to match reference
The desktop header should show:
- Logo (left)
- Full-width search bar (center)
- Currency selector, Discord button, notifications, cart, account (right)

This is already implemented in the `hidden md:flex` block — just needs the sidebar gone so it spans full width.

### 4. Fix GlobalCategoryBar width
- Remove `container` constraint so it spans the full content area
- Ensure pills scroll horizontally like in the reference

### 5. Ensure all landing sections render full-width on desktop
- Sections use `px-4 sm:px-6 lg:px-8` which is fine for full-width layout once the sidebar is removed

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/landing/LandingHero.tsx` | Remove Eclipse+ CTA link |
| `src/components/layout/Header.tsx` | Remove Eclipse+ from navLinkDefs |
| `src/components/layout/LayoutShell.tsx` | Hide desktop sidebar rendering |
| `src/components/shop/GlobalCategoryBar.tsx` | Remove `container` class constraint if needed |

## Technical Notes
- No database changes needed
- No new dependencies
- 4 files modified
- The mobile drawer sidebar remains fully functional

