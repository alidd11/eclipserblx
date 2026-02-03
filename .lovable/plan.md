
# PWA-Optimized Landing Page

## Overview

Create a simplified, mobile-first landing page specifically for users accessing the app as an installed PWA (Progressive Web App). This design will mirror the clean, impactful layout of ClearlyDev while maintaining Eclipse's brand identity.

The desktop browser experience will remain unchanged - this is exclusively for PWA/standalone mode users.

## What You'll Get

**PWA Experience:**
- A bold, full-screen hero section that fills the viewport
- Large headline: "The All-In-One Platform for **Roblox Creators**" (with "Roblox Creators" in your brand primary color)
- Concise value proposition paragraph
- Two prominent, full-width action buttons: "Shop" (filled) and "Open a Store" (outline)
- Platform statistics bar showing: Processed Sales, Total Purchases, Products Uploaded
- Clean, distraction-free design optimized for touch interaction

**Desktop Experience:**
- No changes - continues using the current full landing page with all sections

## Design Details

**Typography:**
- Extra-large, bold headline using the existing display font (Orbitron)
- Comfortable line height for readability on mobile screens
- Muted description text for the tagline

**Buttons:**
- Full-width buttons stacked vertically for easy thumb access
- "Shop" button: Solid primary background with rounded-full corners (similar to ClearlyDev's blue button)
- "Open a Store" button: Outline style with border

**Statistics Bar:**
- Three-column layout showing platform metrics
- Large, bold numbers
- Small muted labels beneath each stat
- Data pulled from existing database tables (stores, products, transactions)

**Layout:**
- Full viewport height hero section
- Content centered vertically
- Generous padding that respects safe areas
- Subtle gradient background matching the existing design system

## Technical Approach

1. **Create a new component**: `PWALandingHero.tsx` in `src/components/landing/`
   - Standalone full-page hero for PWA mode
   - Fetches platform statistics from database

2. **Create a PWA detection hook**: `usePWAStandalone.ts` in `src/hooks/`
   - Reusable hook that returns whether the app is running in standalone PWA mode
   - Uses the same detection pattern already established in the codebase

3. **Update Landing page**: `src/pages/Landing.tsx`
   - Conditionally render the PWA version vs desktop version based on standalone mode
   - PWA mode: Show only the new `PWALandingHero` component
   - Browser mode: Show existing full landing page

4. **Add database query**: Fetch aggregate stats for the statistics bar
   - Total processed sales (sum of completed order amounts)
   - Total purchases (count of completed orders)
   - Products uploaded (count of active products)

---

## Technical Details

### New Files

**1. `src/hooks/usePWAStandalone.ts`**
```typescript
// Reusable hook for PWA standalone detection
// Returns: { isStandalone: boolean, isLoading: boolean }
// Uses matchMedia('(display-mode: standalone)') + navigator.standalone
```

**2. `src/components/landing/PWALandingHero.tsx`**
```typescript
// Full-viewport hero for PWA mode
// - Uses MainLayout wrapper (keeps header/sidebar consistent)
// - Fetches platform stats via React Query
// - Responsive padding with safe-area-inset support
// - Two CTA buttons: Shop + Open a Store
// - Statistics bar at bottom
```

### Modified Files

**`src/pages/Landing.tsx`**
- Import the new `usePWAStandalone` hook
- Import the new `PWALandingHero` component
- Add conditional rendering based on `isStandalone`

### Database Query for Stats

Uses existing tables - no schema changes required:
```sql
-- Total processed sales (from completed orders)
SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'completed'

-- Total purchases 
SELECT COUNT(*) FROM orders WHERE status = 'completed'

-- Products uploaded
SELECT COUNT(*) FROM products WHERE is_active = true
```

### Component Structure

```text
Landing.tsx
├── [if PWA standalone]
│   └── MainLayout
│       └── PWALandingHero
│           ├── Hero Section (full height)
│           │   ├── Headline + Description
│           │   └── CTA Buttons (Shop, Open a Store)
│           └── Stats Bar (3 columns)
│
└── [if browser]
    └── MainLayout
        ├── LandingHero
        ├── ActiveOffersCard
        ├── PromotionCarousel
        ├── LandingCategories
        ├── LandingFeaturedProducts
        ├── LandingTrustSignals
        └── LandingCTA
```

### Safe Area Handling

The PWA landing will use the established patterns:
- `h-[100dvh]` for full viewport height
- `pb-[env(safe-area-inset-bottom)]` for bottom safe area
- `pt-[env(safe-area-inset-top)]` for top safe area (handled by MainLayout header)
