

# Mobile Header Design Improvements

## Overview
Enhance the visual design and user experience of the search bar and currency selector that were recently added to the mobile header row. The goal is to create a polished, native-app-quality interface that feels cohesive with the Eclipse brand while maintaining excellent usability on small screens.

---

## Current State
The mobile header currently displays:
- Back button + Menu button + Logo on the left
- Search bar (compact) + Currency selector (compact) in the center
- Notification bell + Cart + User/Sign In on the right

**Current issues to address:**
- Elements feel cramped with minimal visual hierarchy
- Search bar and currency selector use the same visual style (both `bg-muted/50 border border-border`)
- No clear visual distinction between interactive elements
- Currency selector dropdown icon adds visual noise
- Touch targets could feel small on some devices

---

## Design Improvements

### 1. Visual Hierarchy & Grouping

**Search Bar Enhancements:**
- Make the search bar the dominant element with a slightly elevated appearance
- Add a subtle inner shadow to create depth (pill-button feel)
- Use a more muted placeholder to reduce visual weight
- Consider a slight gradient or glass-effect background

**Currency Selector Refinements:**
- Make it more compact and icon-focused (just the currency symbol)
- Remove the chevron on mobile to save space
- Add a subtle tap indicator (e.g., ring on focus)
- Position it as a secondary action next to search

### 2. Spacing & Touch Targets

- Increase gap between search and currency from `gap-2` to `gap-2.5`
- Ensure minimum 44px touch targets for PWA compliance
- Add more breathing room with adjusted padding

### 3. Color & Styling Refinements

```text
┌─────────────────────────────────────────────────────────────┐
│  [←] [≡] [◉]    [🔍 Search...       ]  [£]   [🔔][🛒][👤] │
│       │   │              │               │                   │
│   Back Menu Logo    Search Bar     Currency    Actions       │
└─────────────────────────────────────────────────────────────┘
```

**Search Bar:**
- Background: `bg-muted/60` with subtle glass effect
- Border: Softer `border-border/50` → `border-primary/40` on focus
- Icon: Muted by default, primary on focus
- Placeholder: Lighter weight, smaller size

**Currency Selector:**
- Background: `bg-background/50` (lighter than search)
- Border: Subtle `border-border/50`
- Symbol: Larger, primary color
- No chevron on compact mode
- Circular/pill shape for visual distinction

### 4. Interactive States

**Search Bar:**
- Idle: Subtle, recessed appearance
- Hover/Tap: Slight lift, border glow
- Focus ring: Primary color ring

**Currency Selector:**
- Idle: Circular badge appearance
- Tap: Scale down briefly (haptic feedback already exists)
- Selected state: Subtle primary border

### 5. Animation Polish

- Add subtle scale animation on tap for both elements
- Smooth border-color transitions
- Consider a gentle pulse on the search bar to draw attention (first-time users only, store in localStorage)

---

## Technical Implementation

### Files to Modify

1. **`src/components/layout/HeaderSearchBar.tsx`**
   - Update compact mode styling with refined colors
   - Add focus state enhancements
   - Consider active state animation

2. **`src/components/layout/CurrencySelector.tsx`**
   - Update compact mode to remove chevron
   - Make the button more circular/badge-like
   - Enhance the visual styling

3. **`src/components/layout/Header.tsx`**
   - Adjust the mobile search+currency container spacing
   - Fine-tune the overall mobile header layout
   - Consider adjusting element order if needed

### Code Changes Summary

**HeaderSearchBar.tsx (compact mode):**
```tsx
// Refined compact styling
className={cn(
  "flex items-center gap-1.5 w-full h-9 px-3 rounded-full",
  "bg-muted/40 backdrop-blur-sm",
  "border border-border/40 hover:border-primary/40",
  "text-muted-foreground/80 hover:text-foreground",
  "transition-all duration-200 cursor-text",
  "active:scale-[0.98]",
  // ... focus states
  compact && "h-8 px-2.5",
  className
)}
```

**CurrencySelector.tsx (compact mode):**
```tsx
// Badge-style currency indicator
className={cn(
  "flex items-center justify-center h-8 w-8 rounded-full",
  "bg-background/60 backdrop-blur-sm",
  "border border-border/40 hover:border-primary/40",
  "text-sm font-semibold text-foreground",
  "transition-all duration-200",
  "active:scale-[0.95]",
  className
)}
// Remove chevron in compact mode
// Show only currency symbol (£, $, €)
```

**Header.tsx (mobile container):**
```tsx
// Refined spacing and alignment
<div className="flex md:hidden items-center gap-2.5 flex-1 min-w-0">
  <HeaderSearchBar className="flex-1 min-w-0" compact />
  <CurrencySelector compact className="shrink-0" />
</div>
```

---

## Expected Result

A polished mobile header where:
- ✅ Search bar is clearly the primary action with a soft, tappable pill design
- ✅ Currency selector is a compact, circular badge that's easy to tap
- ✅ Both elements feel cohesive with the Eclipse glass-effect aesthetic
- ✅ Touch targets meet 44px minimum for PWA/mobile
- ✅ Smooth micro-interactions provide satisfying feedback
- ✅ Visual hierarchy guides users naturally to search first

