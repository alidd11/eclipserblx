

# Redesign Region Cards: Labels Above, Full Flag Below

## Overview
Redesign the region cards so the country names appear in a separate label section **above** the flag images, allowing the flags to be displayed at 100% visibility with no overlays.

## Proposed Design

```text
┌─────────────────────┐
│   United Kingdom    │  ← Solid card header with name + count
│     12 items        │
├─────────────────────┤
│                     │
│    🇬🇧 FLAG IMAGE    │  ← Full visibility, no overlay at all
│                     │
│                     │
└─────────────────────┘
```

## Technical Approach

### Card Structure
- Use `flex flex-col` layout
- **Top section**: Solid `bg-card` panel with country name and item count
- **Bottom section**: Flag image with `object-cover` and NO gradient overlay

### Flag Display
- Keep `object-cover` to fill the space beautifully
- Keep `object-top` to anchor flag designs properly
- Remove ALL gradient overlays - the flag is completely unobscured
- Maintain hover scale animation

### Label Section (Top)
- Clean `bg-card` or `bg-muted` background with bottom border
- Professional typography with proper spacing
- High contrast text on solid background

## File to Modify
`src/pages/RegionSelect.tsx`

## Code Changes

### Lines 201-230 - Complete card redesign:

```tsx
<div className="flex-1 grid grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto w-full">
  {data.regions.map((region) => (
    <Link
      key={region.code}
      to={region.slug ? `/products?category=${region.slug}${sourceParam}` : '#'}
      className={`group flex flex-col h-full rounded-2xl overflow-hidden border border-border bg-card shadow-md hover:shadow-xl hover:border-primary/50 transition-all duration-300 ${
        !region.slug ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {/* Label Section - Above the flag */}
      <div className="bg-card border-b border-border p-3 sm:p-4 text-center flex-shrink-0">
        <span className="block text-sm sm:text-base font-semibold text-foreground">
          {region.name}
        </span>
        <span className="block text-xs text-muted-foreground mt-0.5">
          {region.productCount} {region.productCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Flag Image - Full visibility, no overlay */}
      <div className="flex-1 relative overflow-hidden">
        <img
          src={region.image}
          alt={`${region.name} flag`}
          className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
        />
      </div>
    </Link>
  ))}
</div>
```

### Lines 141-150 - Update loading skeleton:

```tsx
<div className="flex-1 grid grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto w-full">
  {[1, 2, 3].map((i) => (
    <div key={i} className="flex flex-col h-full min-h-[300px] rounded-2xl overflow-hidden border border-border">
      <Skeleton className="h-16 flex-shrink-0" />
      <Skeleton className="flex-1" />
    </div>
  ))}
</div>
```

## Visual Comparison

| Aspect | Before | After |
|--------|--------|-------|
| Label position | Overlaid at bottom | Separate card at top |
| Flag visibility | ~80% (gradient overlay) | 100% (no overlay) |
| Text legibility | White on gradient | High contrast on solid bg |
| Overlay | `from-black/80` gradient | None |
| Card structure | Absolute positioning | Flex column layout |

## Benefits
- Flags are 100% visible with absolutely no darkening
- Country names are clearly readable on solid backgrounds
- Professional, modern card design
- Better accessibility with high contrast text
- Cards still stretch to fill viewport height
- Flag images fill the entire bottom section beautifully

