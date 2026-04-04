
# Customer Experience Full Overhaul — Gaming Marketplace

Transform the entire customer-facing experience into a bold, immersive gaming marketplace inspired by Roblox Creator Store and Steam.

---

## 1. Homepage — Immersive Landing

- **Hero section**: Add a subtle animated gradient background with deeper contrast, bolder typography, and a glowing CTA button
- **Section headers**: Replace plain text with bold uppercase tracking, accent underlines, and optional glow effects
- **Product cards**: Add a subtle border glow on hover, improved badge styling with sharper contrast
- **Trending/New sections**: Add section numbering or ranking badges for trending items

**Files**: `Index.tsx`, `ProductCard.tsx`, section components

## 2. Product Detail Page — Steam-style Immersion

- **Image gallery**: Larger, more cinematic presentation with dark overlay gradients
- **Trust badges**: Redesign with gaming-style iconography — shield icons, checkmarks with subtle glow
- **Price area**: Bold pricing with a prominent "Add to Cart" CTA, sale prices with strikethrough styling
- **Reviews section**: Star ratings with filled/empty star visuals, reviewer badges

**Files**: `ProductPage.tsx`, trust components

## 3. Account Dashboard — Player Profile Feel

- **Profile header**: Gaming-style profile card with level/stats display, Eclipse+ badge prominence
- **Order history**: Timeline-style with status pills matching seller dashboard style
- **Wallet section**: Balance card with gradient styling, transaction history with icons
- **Wishlist**: Grid view with quick-add-to-cart actions

**Files**: Account page components

## 4. Cart & Checkout — Streamlined Conversion

- **Cart page**: Cleaner item cards with product thumbnails, quantity controls, and savings highlights
- **Checkout**: Maintain existing embedded Stripe flow but polish the surrounding UI
- **Order confirmation**: Add celebration animation and clear next-steps

**Files**: Cart/checkout components

## 5. Navigation & Global Polish

- **Category bar**: Sharper pill styling with active state glow
- **Customer sidebar**: Gaming-themed with status indicators, quick-stat badges
- **Search results**: Better card layout with relevance indicators
- **Mobile bottom tab bar**: Polish icons and add subtle active state animations
- **Empty states**: Gaming-themed illustrations and CTAs across all pages

**Files**: Layout components, navigation components

## 6. Design Token Updates

- Enhance CSS variables for deeper contrast, add gaming-specific tokens:
  - `--glow-primary` for accent glows
  - Sharper card borders and hover states
  - Bolder gradient combinations

**Files**: `index.css`, `tailwind.config.ts`

---

## Technical Details

- All frontend-only changes (React + Tailwind)
- No database migrations needed
- Uses existing framer-motion for animations
- Mobile-first responsive approach preserved
- Maintains all existing business logic and data fetching

## Priority Order

1. Design tokens + global polish (foundation)
2. Homepage sections
3. Product cards + detail page
4. Account dashboard
5. Cart & checkout polish
6. Navigation refinements
