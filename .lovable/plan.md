

# Add Hero Banner to Landing Page

## Overview
Add a visually impactful banner section behind the hero content on the landing page, similar to how Vino and other stores display their branding. This will make the homepage look more polished and less plain.

## Current State
The `LandingHero` component currently has a simple flat gradient background:
```tsx
<div className="absolute inset-0 bg-gradient-to-b from-background to-muted/20" />
```

This creates a minimal, plain appearance without any visual interest.

## Proposed Design

### Option A: Dynamic Gradient Banner (Recommended)
A gaming-inspired animated gradient banner with subtle patterns:
- Animated gradient using the platform's primary purple/blue colors
- Subtle grid or geometric pattern overlay for gaming aesthetic
- Smooth color transitions for visual appeal
- Dark overlay for text readability

### Option B: Uploadable Image Banner
Allow admins to set a custom banner image from settings:
- Store banner URL in settings table
- Fetch and display the image as background
- Fallback to gradient if no image is set

## Implementation Plan

### 1. Create HeroBanner Component
Create a new `src/components/landing/HeroBanner.tsx` component that renders:
- Full-width banner container with appropriate height (~300-400px on desktop, ~200px on mobile)
- Animated gradient background using CSS keyframes
- Optional geometric pattern overlay (subtle grid/lines)
- Dark gradient overlay for text contrast
- Responsive sizing

### 2. Update LandingHero Component
Modify `src/components/landing/LandingHero.tsx` to:
- Import and use the new `HeroBanner` component
- Position hero text content over the banner
- Adjust text colors/shadows for visibility on the banner

### 3. Add CSS Animations (Optional Enhancement)
Add subtle animations to `src/index.css`:
- Slow-moving gradient animation
- Subtle shimmer effect

## Visual Reference

```text
┌─────────────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░ ANIMATED GRADIENT ░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░ WITH PATTERN ░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         🏪 The Roblox Creator Marketplace             │  │
│  │                                                       │  │
│  │         Level Up Your Roblox Experience.              │  │
│  │                                                       │  │
│  │     Premium scripts, models, UI kits, and game...     │  │
│  │                                                       │  │
│  │        [Active Offers Card]                           │  │
│  │                                                       │  │
│  │     [Start Selling]  [Browse]  [Eclipse+]             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Details

### New Component: HeroBanner.tsx
```tsx
// Key features:
// - Animated gradient using CSS custom properties
// - Geometric pattern overlay (optional)
// - Responsive height (h-[350px] md:h-[450px] lg:h-[500px])
// - Dark overlay gradient for text readability
```

### CSS Animation (in index.css)
```css
@keyframes hero-gradient {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
```

### Files to Create
- `src/components/landing/HeroBanner.tsx` - New banner component

### Files to Modify  
- `src/components/landing/LandingHero.tsx` - Integrate banner, adjust layout
- `src/index.css` - Add gradient animation keyframes

## Benefits
- More visually engaging homepage
- Gaming aesthetic that matches the Roblox creator theme
- Consistent with how stores (like Vino) display their branding
- Maintains text readability with proper overlay
- Responsive across all device sizes

