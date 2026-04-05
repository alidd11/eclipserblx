

## Overhaul Sidebar User Profile Section

The current sidebar user section (lines 489-584 of `CustomerSidebar.tsx`) has a stacked layout with separate blocks for user info, balance, orders/wishlist stats, and seller CTA — creating visual gaps and a cluttered feel.

### Design

Consolidate into a tighter, more polished card-style section:

1. **Profile row** — Keep avatar + name + username + close button, but tighten spacing and make the avatar slightly larger (h-11 w-11) for prominence
2. **Inline balance + add funds** — Merge into a single compact row directly below the name, removing the separate muted card wrapper. Show the balance as part of the user identity rather than a separate block
3. **Orders / Wishlist pills** — Combine into a single row of compact pill buttons with just icon + count (drop the text labels "Orders"/"Wishlist" to save space), styled as subtle outlined chips
4. **Seller Dashboard CTA** — Keep gradient button but reduce vertical padding slightly for a more refined look

### Layout (top to bottom)

```text
┌─────────────────────────────┐
│  [Avatar]  DisplayName   [X]│
│           @username         │
│           £0.00 · + Add     │
├─────────────────────────────┤
│  [📦 6]        [♡ 0]       │
├─────────────────────────────┤
│  ⚡ Seller Dashboard        │
└─────────────────────────────┘
```

### Changes

**File: `src/components/layout/CustomerSidebar.tsx`** (lines 489-584)

- Move balance display inline with username area (below `@username`, same container)
- Replace the `bg-muted/40 rounded-xl` balance card with a simple inline `£0.00 · + Add Funds` text row
- Slim down the orders/wishlist row — remove text labels, keep icon + count only, use smaller pill styling
- Reduce overall vertical padding from `py-4 space-y-3` to `py-3 space-y-2`
- Reduce Seller Dashboard button padding from `py-3` to `py-2.5`

Single file change, visual-only — no logic changes.

