

## Admin Dashboard Error Audit

### Error Found

**1. "Function components cannot be given refs" warning for `ActivityFeed`**

This React warning appears in the console. The `ActivityFeed` component is a plain function component that doesn't use `forwardRef`. While it's used directly as `<ActivityFeed />` without an explicit ref in `Dashboard.tsx`, React's internal reconciliation can trigger this warning when a function component is placed where a ref-forwarding component is expected.

**Fix**: Wrap `ActivityFeed` with `React.forwardRef` to silence the warning and make it ref-safe.

### Revenue Page (previously reported crash)

The Revenue page crash on Safari was addressed in earlier messages by improving chunk error recovery. The code itself is structurally sound — all queries have proper error handling, charts disable animations for WebKit users, and lazy imports have Suspense fallbacks.

### Implementation Plan

**File: `src/components/admin/dashboard/ActivityFeed.tsx`**
- Wrap the component with `React.forwardRef` so it can accept refs without warnings
- Change from `export function ActivityFeed()` to `export const ActivityFeed = forwardRef<HTMLDivElement>(...)` 
- Add the ref to the outer `<Card>` element

This is a minor fix — the warning doesn't cause crashes but clutters the console and could mask real errors.

