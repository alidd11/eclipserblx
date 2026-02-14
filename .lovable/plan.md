

## Wrap Featured Stores in a Card with Uppercase Text

### Changes

**File: `src/components/landing/PWAFeaturedStores.tsx`**

1. Wrap the entire featured stores section in a card container (`rounded-lg border bg-card p-3`) to match the visual style of other landing page cards.
2. Convert the "Featured Stores" heading and "View All" link text to uppercase using the `uppercase` Tailwind class and add `tracking-wider` for proper letter spacing.
3. The inner content (spotlight card + grid) remains unchanged -- just enclosed in the new card wrapper.

### Technical Details

- The outer `div` with `space-y-3` becomes a card: `rounded-lg border border-border bg-card p-3 space-y-3`
- The header text "Featured Stores" gets `uppercase tracking-wider` classes
- The "View All" link text also gets `uppercase tracking-wider`
- No structural or data changes -- purely visual wrapper and text transform

