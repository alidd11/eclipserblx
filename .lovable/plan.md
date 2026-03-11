

## Fix: Chat Widget overlapping "Powered by Eclipse" badge on store subdomains

### Problem
1. The chat widget (`z-[9999]`, bottom-right) sits directly on top of the "Powered by Eclipse" badge (`z-40`, `bottom-4 right-4`) on subdomain/custom domain stores
2. The live chat widget is for Eclipse platform support — it's not relevant on seller subdomains/custom domains where the seller's customers are browsing

### Solution

**Hide the ChatWidget on store subdomains/custom domains entirely.**

The chat widget is Eclipse's support channel, not the seller's. Customers on a seller's subdomain shouldn't see Eclipse's support chat — they should contact the seller directly. This also eliminates the overlap with the "Powered by Eclipse" badge.

#### Changes

**1. `src/components/chat/ChatWidget.tsx`** — Add a check for `isCustomStoreDomain` from `useStoreDomain()`. If true, return `null` (same pattern as the existing admin route check).

```tsx
const { isCustomStoreDomain } = useStoreDomain();

const isAdminRoute = location.pathname.startsWith('/admin');
if (isAdminRoute || isCustomStoreDomain) return null;
```

**2. `src/components/chat/ChatSidePanel.tsx`** — Same guard to prevent the side panel from rendering on store subdomains.

No database changes needed. No changes to the "Powered by Eclipse" badge positioning.

