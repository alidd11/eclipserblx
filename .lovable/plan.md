

## Enterprise-Level Full-Screen Search Experience

Replace the current floating command palette with a full-screen search takeover that feels native and premium on all devices.

### Design

```text
┌─────────────────────────────────────┐
│  ← Back    [🔍 Search...        ] X │  ← Sticky top bar
├─────────────────────────────────────┤
│  RECENT          Clear all          │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐          │  ← Horizontal pills
│  └───┘ └───┘ └───┘ └───┘          │
├─────────────────────────────────────┤
│  TRENDING                           │
│  ┌─────┐ Product Name      £2.00   │
│  │ img │ Product Name      £3.50   │  ← List rows with thumbnails
│  │ img │ Product Name      £1.00   │
│  └─────┘                            │
├─────────────────────────────────────┤
│  CATEGORIES                         │
│  ┌──────┐ ┌──────┐ ┌──────┐       │  ← Quick-tap category chips
│  │Vehicles│ │Scripts│ │ Maps │       │
│  └──────┘ └──────┘ └──────┘       │
└─────────────────────────────────────┘

When typing → results replace trending:
┌─────────────────────────────────────┐
│  ← Back    [🔍 "ford bun"      ] X │
├─────────────────────────────────────┤
│  PRODUCTS  3 results                │
│  ┌─────┐ Ford Transit Bundle £2.50 │
│  │ img │ Ford Focus Pack     £3.00 │
│  └─────┘                            │
│  STORES  1 result                   │
│  ┌─────┐ Ford Motors         ✓     │
│  └─────┘                            │
├─────────────────────────────────────┤
│  [  View all results →            ] │
└─────────────────────────────────────┘
```

### Key UX decisions

- **Full viewport overlay** — `fixed inset-0 z-50 bg-background` with smooth slide-up animation on mobile, fade-in on desktop
- **No cmdk dependency** — replace `CommandDialog` with a custom full-screen component. This removes the small floating modal and keyboard-hint footer that feel out of place on mobile
- **Auto-focus input** on open with native keyboard appearance on mobile
- **Recent searches as horizontal pills** (tappable, swipeable) instead of a vertical list
- **Category quick-filters** — horizontal chip row so users can tap "Vehicles" and immediately see filtered results without leaving search
- **Smooth exit** — back button or swipe-right to close, maintaining the page underneath
- **Desktop adaptation** — same full-screen layout but max-width constrained to ~720px centered, with `Esc` to close and ⌘K shortcut preserved
- **Remove keyboard shortcut footer** — unnecessary on mobile, clutters the UI

### Technical changes

| File | Change |
|---|---|
| `src/components/search/SearchCommandPalette.tsx` | Full rewrite — replace cmdk-based dialog with custom full-screen overlay component |
| `src/components/search/SearchCategoryChips.tsx` | New — horizontal category chip row for in-search filtering |
| `src/hooks/useSearchCommand.tsx` | No change — keep existing open/close state management |
| `src/components/layout/HeaderSearchBar.tsx` | No change — still triggers `toggle()` |
| `src/components/ui/command.tsx` | No change — keep for potential other uses |

### Animation

- Mobile: `translate-y-full → translate-y-0` slide-up (200ms ease-out)
- Desktop: `opacity-0 scale-98 → opacity-100 scale-100` fade-in (150ms)
- Uses Tailwind transitions, no framer-motion dependency needed

