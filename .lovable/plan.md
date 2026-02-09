

# Plan: Make Product Videos Non-Interactive Across All Pages

## Problem
Product pages with videos currently have issues where:
- Videos can be clicked/interacted with unexpectedly
- Native browser video icons (play/pause overlays on iOS/Android) appear
- These interactions can interrupt the expected user flow (e.g., clicking a product card should navigate to the product, not play/pause the video)

## Solution
Create a reusable video component that ensures videos are purely decorative/background media in listing contexts, with consistent styling across all pages.

---

## Technical Approach

### Step 1: Create a Reusable Background Video Component

Create a new `BackgroundVideo` component in `src/components/ui/BackgroundVideo.tsx` that:

- Uses `pointer-events-none` to prevent all click interactions
- Applies a transparent overlay to block native video controls on mobile
- Adds `disablePictureInPicture`, `disableRemotePlayback` attributes
- Uses `webkit-media-controls` CSS to hide native controls
- Ensures consistent behavior across browsers

```text
BackgroundVideo Component
┌────────────────────────────────────────┐
│  <div className="relative">            │
│    <video                              │
│      autoPlay muted loop playsInline   │
│      disablePictureInPicture           │
│      disableRemotePlayback             │
│      className="pointer-events-none"   │
│    />                                  │
│    <div className="absolute inset-0    │
│         pointer-events-none" />        │
│  </div>                                │
└────────────────────────────────────────┘
```

### Step 2: Add Global CSS to Hide Native Video Controls

Add CSS in `src/index.css` to hide native video controls for background videos:

```css
/* Hide native video controls for background/decorative videos */
video.background-video::-webkit-media-controls {
  display: none !important;
}
video.background-video::-webkit-media-controls-enclosure {
  display: none !important;
}
video.background-video::-webkit-media-controls-panel {
  display: none !important;
}
```

### Step 3: Update All Video Locations

Replace inline `<video>` elements with the new `BackgroundVideo` component in:

| File | Context | Current State |
|------|---------|---------------|
| `ProductCard.tsx` | Product listings | Needs update |
| `FeaturedProductsCard.tsx` | Featured grid | Needs update |
| `HeroProductShowcase.tsx` | Hero section | Needs update |
| `Featured.tsx` | Featured page | Needs update |

**Note:** `ProductDetail.tsx` will keep the current `<video controls>` implementation since the main product view should allow video playback controls.

---

## Files to Create

1. **`src/components/ui/BackgroundVideo.tsx`** - New reusable component

## Files to Modify

1. **`src/index.css`** - Add CSS to hide native controls
2. **`src/components/ui/ProductCard.tsx`** - Use BackgroundVideo
3. **`src/components/home/FeaturedProductsCard.tsx`** - Use BackgroundVideo
4. **`src/components/landing/HeroProductShowcase.tsx`** - Use BackgroundVideo
5. **`src/pages/Featured.tsx`** - Use BackgroundVideo

---

## Component API

```typescript
interface BackgroundVideoProps {
  src: string;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
}
```

The component will:
- Accept a `videoRef` for cases like `ProductCard` where mouse hover controls play/pause
- Include an invisible overlay div to intercept any touches on mobile
- Apply all necessary attributes to suppress native browser behavior

---

## Benefits

- **Consistent behavior**: All background videos work identically
- **Single source of truth**: One component to maintain
- **No native icons**: CSS and attributes hide browser-specific overlays
- **Non-clickable**: Videos don't interfere with card navigation
- **Mobile-friendly**: Overlay blocks touch interactions on iOS/Android

