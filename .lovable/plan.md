
# Fix: Region Select Flags Not Displaying Correctly

## Problem

The flag images on the Region Select page are being heavily cropped because:
- The containers are tall and narrow (portrait orientation on mobile)
- `object-cover` stretches and crops the landscape-oriented flag images to fill the container
- `object-center` centers the crop, cutting off key parts of flags (UK's Union Jack corners, US's blue field)

## Solution

Change from `object-cover` to `object-contain` so the full flag is always visible within the container, with the container background filling any empty space.

## Technical Changes

### File: `src/pages/RegionSelect.tsx`

**Change the image styling:**

```tsx
// Before (line 231)
className="absolute inset-0 w-full h-full object-cover object-center ..."

// After
className="absolute inset-0 w-full h-full object-contain object-center ..."
```

**Add a background color to the container** so any empty space around the flag looks clean:

```tsx
// Before (line 224)
className={`group relative min-w-0 rounded-xl sm:rounded-2xl overflow-hidden border border-border shadow-md ...`}

// After - add bg-muted/50 for subtle background behind contained flag
className={`group relative min-w-0 rounded-xl sm:rounded-2xl overflow-hidden border border-border shadow-md bg-muted/30 ...`}
```

## Result

- Full flags will be visible at all screen sizes
- No important flag elements will be cropped
- Clean muted background fills any gaps around the flag
