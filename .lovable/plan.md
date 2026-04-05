

## Fix Grey Bar at Bottom of Mobile Sidebar

The grey strip visible at the bottom of the sidebar drawer is the `SheetContent` container's background (`bg-card`) showing through below the sidebar content. The sidebar itself uses `bg-sidebar` (near-black), but the Sheet wrapper uses `bg-card` (lighter grey) with safe-area bottom padding — creating a visible mismatch.

### Fix — Single file: `LayoutShell.tsx`

**Change the `SheetContent` background** from `bg-card` to `bg-sidebar` so the container matches the sidebar's own background color. This eliminates the color mismatch in the safe-area padding zone.

```
// Current (line ~89)
className="p-0 w-[280px] border-r-0 bg-card overflow-hidden ..."

// Updated
className="p-0 w-[280px] border-r-0 bg-sidebar overflow-hidden ..."
```

One word change, one file.

