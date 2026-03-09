

# Store Customization Overhaul — Payhip Parity

## What Payhip Offers That We're Missing

Payhip gives sellers a full **store builder** with:
1. **Custom Pages** — sellers create standalone pages (FAQ, About, Contact, etc.) with rich text
2. **Navigation Links** — sellers control their store's top navigation menu (add/remove/reorder links to pages, categories, or external URLs)
3. **Sections** — drag-and-drop content blocks on the homepage (text, images, featured products, testimonials, video embeds)
4. **Themes** — multiple pre-built visual themes to choose from
5. **Custom CSS** — full CSS override capability
6. **Announcement Bar** — configurable top banner
7. **Favicon** — custom browser icon
8. **Remove Branding** — hide "Powered by" badge (premium)

## What We Already Have
- Themes (5 options), accent colors, fonts, layout styles
- Hero section (title, subtitle, CTA)
- Announcement bar with scheduling
- Custom CSS
- Custom Sections (content blocks on store page)
- Show/hide reviews and social proof toggles
- Banner image with date scheduling

## Gaps to Fill

### 1. Custom Pages (High Impact)
Sellers need to create standalone pages (FAQ, Returns Policy, Contact, etc.) that live under their store URL.

- **New table**: `store_pages` — `id, store_id, title, slug, content (rich text/HTML), is_published, display_order, created_at, updated_at`
- **New seller page**: `/seller/store-pages` — CRUD interface with the existing TipTap rich text editor
- **New public route**: `/store/:storeSlug/page/:pageSlug` — renders the custom page within StoreLayout
- **Standalone domain support**: Add route to `StoreStandalonePage.tsx`

### 2. Custom Navigation (High Impact)
Sellers need to control what links appear in their store's navigation bar.

- **New table**: `store_nav_links` — `id, store_id, label, url, link_type (page|category|external|section), target_id, display_order, is_visible`
- **New seller UI**: Navigation editor within Appearance settings — add/remove/reorder links pointing to custom pages, categories, or external URLs
- **Store rendering**: Update `StoreSidebar.tsx` / `StoreLayout.tsx` to render seller-defined nav links instead of only category tabs

### 3. Favicon (Low Effort)
- **New column** on `stores`: `favicon_url text`
- **Upload UI** in Appearance settings
- **Rendering**: Inject `<link rel="icon">` in `StoreStandalonePage` via `useEffect` when on custom domain

### 4. Homepage Sections Builder (Medium Effort — Enhancement of Existing)
The existing `store_custom_sections` already supports content blocks. Enhance with:
- **New section types**: `featured_products`, `image_banner`, `video_embed`, `testimonials` (currently only text/html)
- **Drag-and-drop reordering** in the seller editor (we already have `@dnd-kit` installed)
- **Section visibility toggle** per section

### 5. Hide "Powered by" Badge (Low Effort)
- **New column** on `stores`: `hide_branding boolean default false`
- Gate behind the custom domain subscription
- Update `StoreStandalonePage.tsx` to conditionally hide the badge

## Implementation Plan

### Phase 1 — Custom Pages + Navigation (core Payhip parity)

**Database Migration:**
```sql
-- Custom pages
CREATE TABLE public.store_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT DEFAULT '',
  is_published BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, slug)
);
ALTER TABLE store_pages ENABLE ROW LEVEL SECURITY;

-- Navigation links
CREATE TABLE public.store_nav_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT,
  link_type TEXT NOT NULL DEFAULT 'page',
  target_id UUID,
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE store_nav_links ENABLE ROW LEVEL SECURITY;

-- Favicon + branding columns
ALTER TABLE stores ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS hide_branding BOOLEAN DEFAULT false;
```

**Files to Create:**
- `src/pages/seller/SellerStorePages.tsx` — CRUD editor for custom pages with TipTap
- `src/pages/StoreCustomPage.tsx` — Public page renderer
- `src/components/seller/StoreNavEditor.tsx` — Navigation link manager (drag-and-drop)

**Files to Modify:**
- `src/components/AppRoutes.tsx` — Add `/seller/store-pages`, `/store/:storeSlug/page/:pageSlug`
- `src/pages/StoreStandalonePage.tsx` — Add custom page route, favicon injection, conditional branding
- `src/components/store/StoreLayout.tsx` — Render seller-defined nav links
- `src/components/store/StoreSidebar.tsx` — Include custom pages and nav links
- `src/components/seller/SellerSidebar.tsx` — Add "Pages" under Catalog group
- `src/pages/seller/SellerSettingsAppearance.tsx` — Add favicon upload + nav editor tab + hide branding toggle

### Phase 2 — Enhanced Sections Builder
- Add new section types to `store_custom_sections`
- Add drag-and-drop reordering with `@dnd-kit`
- Add section visibility toggle

This gives sellers the same level of storefront control as Payhip: custom pages, custom navigation, full visual customization, and white-label branding on their own domain.

