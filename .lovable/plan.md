
# Remove Grey Area Around Mobile Tab Bar

The tab bar currently uses `bg-card/95` which creates a visible grey/card-colored background that looks disconnected from the page content. The fix is to make the tab bar background match the page background seamlessly.

## Changes

### File: `src/components/layout/MobileTabBar.tsx`
- Change `bg-card/95` to `bg-background/95` on the `<nav>` element so the bar blends with the page background instead of appearing as a separate grey card
- Remove `border-t border-border` to eliminate the visible separator line, creating a more seamless edge-to-edge look
- Keep `backdrop-blur-md` for the frosted glass effect so content scrolling underneath still looks polished
