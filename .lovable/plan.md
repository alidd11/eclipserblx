

# Apply Global Animated Gradient Background

## Overview
Apply a subtle, slow-moving animated gradient as the global page background across the entire website. This will create a premium, immersive aesthetic while maintaining readability by using reduced opacity and glass-effect overlays on content areas.

## Design Approach

The gradient will be rendered as a fixed background layer behind all content. UI elements like the header, sidebar, and content cards will use semi-transparent backgrounds with backdrop-blur to create a "floating" effect over the moving gradient.

```text
+------------------------------------------------------------------+
|  FIXED ANIMATED GRADIENT LAYER (opacity: 15-20%)                 |
|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~    |
|  ~~~~~~~~~~~~ Moving gradient colors ~~~~~~~~~~~~~~~~~~~~~~~~    |
|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~    |
|                                                                  |
|  +------------------+  +--------------------------------------+  |
|  |  SIDEBAR         |  |  HEADER (glass-effect)               |  |
|  |  (glass-effect)  |  +--------------------------------------+  |
|  |                  |  |                                      |  |
|  |                  |  |  CONTENT AREA                        |  |
|  |                  |  |  (cards with glass-effect)           |  |
|  |                  |  |                                      |  |
|  +------------------+  +--------------------------------------+  |
+------------------------------------------------------------------+
```

## Technical Implementation

### 1. Create GlobalBackground Component
Create a new reusable component that renders the animated gradient as a fixed, full-screen background layer:
- Fixed positioning with `inset-0` and `z-[-1]`
- Slower animation (45s instead of 15s) for subtlety
- Reduced opacity (15-20%) so content remains readable
- Grid pattern overlay at very low opacity (2-4%)
- Works across all pages without modifying individual layouts

### 2. Add GlobalBackground to App Root
Mount the `GlobalBackground` component at the app root level (in `App.tsx` or `main.tsx`) so it persists across all routes and layouts.

### 3. Update Tailwind Animation
Modify the `hero-gradient` animation duration from 15s to 45s for a slower, more ambient effect that won't distract users.

### 4. Apply Glass Effects to UI Layers
Update key layout components with semi-transparent backgrounds and backdrop-blur:
- **Header**: `bg-background/80 backdrop-blur-xl`
- **CustomerSidebar**: `bg-sidebar/90 backdrop-blur-xl`
- **StoreSidebar**: `bg-sidebar/90 backdrop-blur-xl`
- **Cards/Content**: Already use `bg-card` which will naturally contrast

### 5. Ensure PWA Safe-Area Compatibility
The global background must work correctly with:
- Safe area insets on iOS devices
- The existing `recalculatePWAViewport` logic
- Both light and dark themes

## Files to Create

### `src/components/layout/GlobalBackground.tsx`
New component that renders the fixed animated gradient layer:
- Animated gradient (same colors as HeroBanner but lower opacity)
- Optional subtle grid pattern
- Fixed positioning to stay behind all content
- Uses the slower 45s animation

## Files to Modify

### `tailwind.config.ts`
- Add a new `hero-gradient-slow` animation variant (45s duration)
- Keep original `hero-gradient` for landing page hero section

### `src/App.tsx`
- Import and render `GlobalBackground` component at the top level

### `src/components/layout/MainLayout.tsx`
- Update the main wrapper div to use transparent/glass background
- Ensure content floats visually over the gradient

### `src/components/layout/Header.tsx`
- Add glass-effect styling: `bg-background/80 backdrop-blur-xl`

### `src/components/layout/CustomerSidebar.tsx`
- Add glass-effect styling: `bg-sidebar/90 backdrop-blur-xl`

### `src/components/store/StoreLayout.tsx`
- Update wrapper to work with global background
- Apply glass effects to sidebar/header areas

### `src/components/store/StoreSidebar.tsx`
- Add glass-effect styling similar to CustomerSidebar

## Visual Specifications

| Property | Value |
|----------|-------|
| Animation Duration | 45 seconds (infinite loop) |
| Gradient Opacity | 15-20% |
| Grid Pattern Opacity | 2-4% |
| Header Blur | `backdrop-blur-xl` |
| Sidebar Blur | `backdrop-blur-xl` |
| Background Alpha | 80-90% transparency |

## Benefits
- Creates a cohesive, premium visual experience across all pages
- Subtle enough to not distract from content
- Glass-effect overlays add depth and modern aesthetics
- Works seamlessly with existing light/dark themes
- Matches the gaming aesthetic already established
- No performance concerns with CSS-only animations

