

# Improved Homepage Cards Layout

## Problem Analysis

Looking at the current mobile layout, I can identify several design issues:

1. **Side-by-side cramping** - The "Our Community" and "Reviews" cards are displayed in a 2-column grid on mobile, making each card too narrow (~50% width) to display content effectively
2. **Inconsistent heights** - The cards have different content heights causing visual imbalance
3. **Wasted space** - Large fixed-height containers (h-24) create empty gaps within cards
4. **Poor content density** - The progress bar and navigation dots take up valuable mobile real estate
5. **Awkward horizontal scroll** - On mobile, the 280px min-width cards in a horizontal scroll feel disconnected

## Proposed Solution

Redesign the three cards (Stats, Reviews, Discord) with a **mobile-first, compact layout** that stacks vertically on small screens and uses a more refined 3-column grid on desktop.

---

## Design Approach

### 1. Mobile Layout (Default)
- Stack all three cards **vertically** in a single column
- Use **compact, horizontal card layouts** for Stats and Reviews
- Stats: Show all 3 metrics in a row instead of rotating carousel
- Reviews: Streamlined single-line quote with avatar

### 2. Tablet/Desktop Layout (md+)
- Maintain the existing 3-column grid
- Keep the animated/rotating behavior for larger screens where there's room

---

## Technical Changes

### File: `src/components/home/HeroSection.tsx`
- Change mobile layout from horizontal scroll to vertical stack
- Grid classes: `flex flex-col gap-3 md:grid md:grid-cols-3`

### File: `src/components/home/StatsCard.tsx`
- Create a **compact mobile variant** showing all 3 stats in a row
- Use `useIsMobile()` hook to conditionally render layouts
- Mobile: Horizontal row with icon + number + label for each stat
- Desktop: Keep the existing rotating carousel with progress bar

### File: `src/components/home/ReviewCard.tsx`  
- Create a **compact mobile variant** with single-line display
- Mobile: Show avatar, truncated quote, and star rating inline
- Desktop: Keep the existing carousel with navigation controls
- Remove the large Quote icon overlay on mobile

### File: `src/components/home/DiscordWidget.tsx`
- Reduce iframe height on mobile (300px vs 400px)
- Add responsive height classes

---

## Visual Preview

### Mobile Layout (Stacked)
```text
┌─────────────────────────────────┐
│ OUR COMMUNITY                   │
│ 📦 45 Products  ⬇ 127+ Downloads  👥 500+ Customers │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ⭐ REVIEWS  ★★★★★               │
│ 👤 "Great service..." - TIC_T4CK  →  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ DISCORD WIDGET                  │
│ [iframe - reduced height]       │
└─────────────────────────────────┘
```

### Desktop Layout (3-Column Grid)
```text
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ OUR COMMUNITY│  │   REVIEWS    │  │   DISCORD    │
│   (rotating) │  │  (carousel)  │  │   (widget)   │
│  127+        │  │  ★★★★★       │  │              │
│  Downloads   │  │  "Quote..."  │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Technical Details

### StatsCard Mobile Variant
```tsx
// Compact horizontal layout for mobile
<div className="flex items-center justify-between gap-2">
  {statItems.map((item) => (
    <div key={item.label} className="flex-1 text-center">
      <item.icon className="h-4 w-4 mx-auto text-primary" />
      <p className="text-lg font-bold">{item.value}+</p>
      <p className="text-[10px] text-muted-foreground">{item.label}</p>
    </div>
  ))}
</div>
```

### ReviewCard Mobile Variant
```tsx
// Compact single-line layout for mobile
<div className="flex items-center gap-3">
  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
    {initial}
  </div>
  <p className="flex-1 text-sm truncate">"{review.content}"</p>
  <div className="flex gap-0.5">
    {stars}
  </div>
</div>
```

---

## Benefits

1. **Better mobile UX** - Content fits naturally without horizontal scrolling
2. **Faster scanning** - All stats visible at once on mobile
3. **Consistent heights** - Compact layouts ensure uniform card heights
4. **Preserved desktop experience** - Animations and carousels remain on larger screens
5. **Follows platform patterns** - Matches the design language of TopSellersCard and NewArrivalsCard

