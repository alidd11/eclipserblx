

# Stretch Region Cards to Fill Viewport Height

## Overview
Make the country cards (UK / US / EU) extend vertically to fill the available screen space above the footer, while keeping the flag images at their current size anchored to the top.

## Current State
- Cards use `aspect-[2/3]` which creates a fixed aspect ratio
- The flag image fills the entire card using `object-cover`
- Cards end and footer begins with significant empty space between them

## Proposed Changes

### File to Modify
`src/pages/RegionSelect.tsx`

### Technical Approach

**1. Make the page fill the viewport**
- Wrap the main content in a flex container with `min-h-[calc(100dvh-var(--header-height))]` or use `flex-1` to fill available space
- This ensures the section stretches to reach the footer

**2. Make the card grid fill available height**
- Change from `space-y-6` layout to a flex column layout
- Give the card grid section `flex-1` so it expands to fill remaining space

**3. Update card structure**
- Remove `aspect-[2/3]` from the image container
- Make cards `h-full` so they fill the grid cell height
- Keep the flag image at a fixed height (e.g., `h-48 sm:h-56`) anchored to the top with `object-cover object-top`
- The card container stretches but the image stays fixed size

**4. Grid updates**
- Add `h-full` to the grid so it fills its flex container
- Cards will naturally stretch to match the tallest cell

### Visual Comparison

```text
BEFORE:                          AFTER:
┌─────────────────────┐          ┌─────────────────────┐
│ Select Your Region  │          │ Select Your Region  │
├─────┬─────┬─────────┤          ├─────┬─────┬─────────┤
│ 🇬🇧  │ 🇺🇸  │ 🇪🇺       │          │ 🇬🇧  │ 🇺🇸  │ 🇪🇺       │
│ UK  │ US  │ EU      │          │     │     │         │
└─────┴─────┴─────────┘          │     │     │         │
                                 │ UK  │ US  │ EU      │
[   View All Regions   ]         └─────┴─────┴─────────┘
                                 [   View All Regions   ]
      (empty space)              ─────────────────────────
─────────────────────────        │ Footer               │
│ Footer               │
```

### Code Changes

**Line 173-174 - Wrapper flex layout:**
```tsx
<MainLayout>
  <div className="container flex flex-col min-h-[calc(100dvh-8rem)] py-6 sm:py-8">
```

**Line 200-201 - Grid fills available space:**
```tsx
{/* Region Cards - Full height stretch */}
<div className="flex-1 grid grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto content-start">
```

**Lines 209-220 - Card and image structure:**
```tsx
<Link
  className={`group relative flex flex-col rounded-xl overflow-hidden border ... h-full`}
>
  {/* Flag Image - Fixed height, anchored top */}
  <div className="relative w-full h-48 sm:h-56">
    <img
      className="absolute inset-0 w-full h-full object-cover object-top ..."
    />
  </div>
  
  {/* Card extends below, text at absolute bottom */}
  <div className="flex-1 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
  
  {/* Content - Positioned at card bottom */}
  <div className="absolute bottom-0 left-0 right-0 z-10 p-3 sm:p-4 text-center">
    ...
  </div>
</Link>
```

**Lines 144-147 - Update loading skeleton:**
```tsx
<div className="flex-1 grid grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto">
  {[1, 2, 3].map((i) => (
    <Skeleton key={i} className="h-full min-h-[300px] rounded-xl" />
  ))}
</div>
```

### Key Implementation Details

| Element | Current | New |
|---------|---------|-----|
| Container | `space-y-6` | `flex flex-col min-h-[calc(100dvh-8rem)]` |
| Grid | Fixed height | `flex-1` to fill space |
| Card | `aspect-[2/3]` | `h-full` (stretch with grid) |
| Flag image | Full card coverage | Fixed `h-48 sm:h-56`, `object-top` anchor |
| Empty space | None | `flex-1` filler div with gradient |

This approach ensures:
- Cards stretch from the header area down to just above the footer
- Flag images remain their current visual size (not stretched)
- The extra card height is filled with a gradient background
- Text stays anchored at the bottom of each card

