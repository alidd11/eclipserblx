

# Categories Page Header Improvement Plan

## Current State
The Categories page header is extremely minimal with just plain text:
- "Categories" title (text-2xl/3xl)
- "Browse our collection by category" subtitle (text-sm muted)
- No visual elements, icons, or branding

## Proposed Improvements

### 1. Add a Visual Badge/Pill
Similar to the Marketplace and Featured pages, add an accent pill above the title:
```text
+-------------------------------+
|  [Grid Icon] Browse Categories  |  <- Rounded pill with icon
+-------------------------------+
```
- Background: `bg-primary/10` with `border border-primary/20`
- Text: `text-primary text-sm font-medium`
- Icon: `Grid3X3` or `LayoutGrid` from Lucide

### 2. Enhanced Typography
- Make the title larger and bolder with display font: `font-display text-3xl md:text-4xl font-bold`
- Keep the subtitle but slightly increase size on desktop: `text-sm sm:text-base`

### 3. Better Vertical Spacing
- Increase margin below header section: `mb-8 sm:mb-10`
- Add more padding between badge and title

### 4. Optional: Subtle Background Gradient
Add a very subtle gradient behind the header area (matching Featured page style):
- `bg-gradient-to-b from-primary/5 via-transparent to-transparent`

## Visual Comparison

**Before:**
```text
           Categories
  Browse our collection by category
```

**After:**
```text
    [Grid] Browse Categories     <- accent pill
    
         Categories              <- larger, bolder
  Browse our collection by category
```

## Technical Changes

### File: `src/pages/Categories.tsx`

Update the header section (approximately lines 155-165):

```tsx
{/* Header */}
<div className="mb-8 sm:mb-10 text-center">
  {/* Accent Badge */}
  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
    <LayoutGrid className="h-4 w-4 text-primary" />
    <span className="text-sm font-medium text-primary">Browse Categories</span>
  </div>
  
  {/* Title */}
  <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
    Categories
  </h1>
  
  {/* Subtitle */}
  <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-md mx-auto">
    Browse our collection by category
  </p>
</div>
```

### Import Addition
Add `LayoutGrid` to the Lucide imports at the top of the file.

## Responsive Behavior

| Device | Title Size | Badge | Spacing |
|--------|-----------|-------|---------|
| Mobile | text-3xl | Compact pill | mb-8 |
| Tablet+ | text-4xl | Same pill | mb-10 |

## Consistency with Other Pages

This design matches the pattern used in:
- **Marketplace**: Badge pill + title + subtitle
- **Featured**: Badge pill + display font title + description
- **RegionSelect**: Will remain simpler since it's a sub-navigation step

