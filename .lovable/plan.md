
# Fix Header Line Alignment - Sign In Button Height Issue

## Problem Analysis

You correctly identified the issue. The Sign In button is taller than intended due to a conflict between:

1. **Button component's `size="sm"` variant** defines:
   ```css
   h-9 rounded-md px-3 min-h-[36px]
   ```

2. **Inline override attempts** in Header:
   ```tsx
   className="... h-8 ... sm:h-9 ..."
   ```

The `min-h-[36px]` from the button variant **always wins** over `h-8` (32px) because CSS `min-height` takes precedence over `height`. This makes the button taller than the other icon buttons (`h-8 w-8`), causing vertical misalignment in the header row.

## Solution

Remove the `size="sm"` prop from the Sign In button and rely purely on inline Tailwind classes for precise height control. This bypasses the `min-h-[36px]` constraint.

## Technical Changes

### File: `src/components/layout/Header.tsx`

**Current code (line 170):**
```tsx
<Button size="sm" className="gradient-button border-0 h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm">
  Sign In
</Button>
```

**Updated code:**
```tsx
<Button className="gradient-button border-0 h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm rounded-md">
  Sign In
</Button>
```

Changes:
- Remove `size="sm"` prop to avoid the `min-h-[36px]` constraint
- Add `rounded-md` since the size variant provided that styling

This ensures the button height matches the other header elements:
- Mobile: `h-8` (32px) - matches icon buttons
- Desktop: `h-9` (36px) - matches icon buttons at `sm:h-9`

## Visual Result

The Sign In button will now align perfectly with the cart, notification, and user icon buttons, creating a clean horizontal line across the header that matches the sidebar border.
