

# Updated Customer Sidebar Reorganization

## Your Request
Keep the **Seller Dashboard** and **Affiliate Dashboard** in a prominent "Quick Access" section at the top of the sidebar, rather than moving them down to "My Account."

---

## Revised Structure

```text
[LOGO]

── QUICK ACCESS ──────────────────
   Home
   Seller Dashboard (if seller)
   Affiliate Dashboard (if enabled)
   Search (inline trigger)

── DISCOVER ──────────────────────
   Featured
   Eclipse+
   Marketplace

── SHOP ──────────────────────────
   All Products
   Categories (expandable)
     ├─ Scripts
     │   ├─ Combat
     │   └─ Utilities
     └─ ...

── COMMUNITY ─────────────────────
   Forum
   Jobs
   Discord

── MY ACCOUNT ────────────────────
   Profile
   My Cart (with count badge)
   Wishlist
   My Purchases
   Notifications (with unread badge)

── HELP ──────────────────────────
   Help Center
   Contact Us
   FAQ
   System Status (with dot)

[LEGAL FOOTER]
   Terms · Privacy · Refunds
```

---

## Key Changes from Original Plan

| Original Plan | Updated Plan |
|---------------|--------------|
| Seller/Affiliate moved to "My Account" at bottom | Seller/Affiliate stay in top "Quick Access" section |
| Mixed with personal items (Cart, Wishlist) | Prominently positioned above all browsing groups |
| Could be missed on first scroll | Immediately visible for power users |

---

## Technical Implementation

### File to Modify
`src/components/layout/CustomerSidebar.tsx`

### Updated navGroups Structure

```typescript
const navGroups: NavGroup[] = [
  {
    id: 'quick-access',
    title: 'Quick Access',
    icon: Home,
    items: [
      { title: 'Home', icon: Home, href: '/' },
      // Seller Dashboard - conditional
      ...(isSeller ? [{ title: 'Seller Dashboard', icon: Store, href: '/seller' }] : []),
      // Affiliate Dashboard - conditional  
      ...(affiliateSettings.isEnabled ? [{ title: 'Affiliate', icon: TrendingUp, href: '/affiliate' }] : []),
    ],
  },
  {
    id: 'discover',
    title: 'Discover',
    icon: Sparkles,
    items: [
      { title: 'Featured', icon: Star, href: '/featured' },
      { title: 'Eclipse+', icon: Circle, href: '/eclipse-plus' },
      { title: 'Marketplace', icon: Store, href: '/marketplace' },
    ],
  },
  {
    id: 'shop',
    title: 'Shop',
    icon: Package,
    items: [
      { title: 'All Products', icon: Grid3X3, href: '/products' },
    ],
    // Categories section rendered after this group
  },
  {
    id: 'community',
    title: 'Community',
    icon: MessageSquare,
    items: [
      { title: 'Forum', icon: MessageSquare, href: '/forum' },
      { title: 'Jobs', icon: Briefcase, href: '/jobs' },
      { title: 'Discord', icon: DiscordIcon, href: discordUrl, external: true },
    ],
  },
  {
    id: 'account',
    title: 'My Account',
    icon: User,
    items: [
      { title: 'Profile', icon: User, href: '/account' },
      { title: 'My Cart', icon: ShoppingCart, href: '/cart' },
      { title: 'Wishlist', icon: Heart, href: '/wishlist' },
      { title: 'My Purchases', icon: Download, href: '/downloads' },
      { title: 'Notifications', icon: Bell, href: '/messages', showNotificationDot: true },
      // Store Messages for sellers
      ...(isSeller ? [{ title: 'Store Messages', icon: MessageSquareText, href: '/store-messages' }] : []),
    ],
  },
  {
    id: 'help',
    title: 'Help',
    icon: HelpCircle,
    items: [
      { title: 'Help Center', icon: HelpCircle, href: '/support' },
      { title: 'Contact Us', icon: Mail, href: '/contact' },
      { title: 'FAQ', icon: FileQuestion, href: '/faq' },
      { title: 'System Status', icon: Activity, href: '/status', showStatusDot: true },
    ],
  },
];
```

### Additional Changes

1. **Remove separate "Selling" group** - Seller Dashboard moves to Quick Access, Store Messages moves to My Account

2. **Add compact legal footer**:
```tsx
<div className="p-2 border-t border-border text-xs text-muted-foreground flex gap-3 justify-center">
  <Link to="/terms" className="hover:underline">Terms</Link>
  <Link to="/privacy" className="hover:underline">Privacy</Link>
  <Link to="/refunds" className="hover:underline">Refunds</Link>
</div>
```

3. **Add Sparkles icon import** for the Discover section header

4. **Add Download icon import** for the new "My Purchases" link

---

## Benefits

| Benefit | Description |
|---------|-------------|
| Seller-first experience | Active sellers see their dashboard immediately |
| Affiliate prominence | Affiliates don't need to hunt for their dashboard |
| Clear customer journey | Discover → Shop → Account flow maintained |
| Reduced clutter | Legal links compressed to footer (~3 fewer nav items) |
| Direct access | "My Purchases" now has direct sidebar link |

---

## Summary of Changes

| Current | New |
|---------|-----|
| 6 nav groups + categories | 5 nav groups + categories + footer |
| "Home" group with 6 mixed items | "Quick Access" with 1-3 focused items |
| Separate "Selling" group | Seller items integrated into Quick Access + Account |
| "Legal" group with 3 full items | Compact footer row |
| "My Messages" | Renamed to "Notifications" |
| No direct "My Purchases" | Direct link to /downloads |

