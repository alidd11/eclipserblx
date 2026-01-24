

# Improving Customer Sidebar Organization

## Current Structure Analysis

The sidebar currently has **6 navigation groups** plus a dynamic **Categories** section:

| Group | Items | Purpose |
|-------|-------|---------|
| Home | 6 items | Personal hub (Account, Cart, Wishlist, Messages, Affiliate) |
| Selling | 2 items | Seller-only (Dashboard, Store Messages) |
| Products | 4 items | Shop navigation (All, Featured, Eclipse+, Marketplace) |
| Categories | Dynamic | Database-driven product categories |
| Community | 3 items | Social (Forum, Jobs, Discord) |
| Support | 4 items | Help (Help Center, Contact, FAQ, Status) |
| Legal | 3 items | Policies (Terms, Privacy, Refunds) |

**Total: ~22+ navigation items** - This creates cognitive overload for customers.

---

## Identified Problems

1. **Home group is overloaded** - Mixes personal items (Account, Cart) with discovery features
2. **Products vs Categories duplication** - "All Products" appears, then a separate "All Categories" link
3. **Legal section rarely used** - Takes up valuable real estate
4. **No clear shopping journey** - Discovery and personal items are intermixed
5. **Featured is buried** - Should be more prominent for marketing
6. **My Messages naming** - Could be clearer (e.g., "Notifications" or "Inbox")

---

## Proposed Reorganization

Restructure around the customer journey: **Discover → Shop → Manage**

### New Structure

```text
[LOGO]

── QUICK ACCESS ──────────────────
   Home
   Search (inline trigger)
   
── DISCOVER ──────────────────────
   Featured (Staff Picks)
   New Arrivals
   Popular
   Eclipse+ Exclusives
   Marketplace

── SHOP ──────────────────────────
   All Products
   Categories (expandable)
     ├─ Eclipse Savers
     ├─ Scripts
     │   ├─ Combat
     │   └─ Utilities
     └─ ...

── COMMUNITY ─────────────────────
   Forum
   Jobs
   Discord

── MY ACCOUNT ────────────────────
   Profile & Settings
   My Cart (with count badge)
   Wishlist
   My Purchases/Downloads
   Notifications (with unread badge)
   [Seller Dashboard - if seller]

── HELP ──────────────────────────
   Help Center
   Contact Us
   System Status (with dot)
   
[LEGAL LINKS - footer style]
   Terms · Privacy · Refunds
```

---

## Key Changes

### 1. Consolidate Quick Actions at Top
Move the most-used items (Home, Search) to a persistent non-collapsible header area.

### 2. Create "Discover" Section
Group all curated/editorial content together:
- Featured (renamed from "Featured")
- Add "New Arrivals" link to `/featured#new-this-week`
- Add "Popular" link to `/featured#popular-picks`
- Eclipse+ and Marketplace

### 3. Separate "Shop" from "Discover"
- "All Products" as the main browsing entry point
- Categories as an expandable subsection (already implemented well)

### 4. Rename "Home" to "My Account"
Move personal items into a clearly labeled section at the bottom:
- Clearer mental model: "stuff about me" vs "stuff to buy"
- Add "My Purchases" link directly (currently only accessible from Account page)

### 5. Compress Legal Links
Move Terms/Privacy/Refunds into a compact footer row using small text links instead of full navigation items.

### 6. Add Visual Hierarchy
- Use subtle section dividers
- Add icons to section headers
- Show cart count badge inline

---

## Technical Implementation

### Files to Modify
1. `src/components/layout/CustomerSidebar.tsx` - Restructure navGroups array

### Changes Required

**Reorganize navGroups array:**
```typescript
const navGroups: NavGroup[] = [
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
    // Categories section renders after this
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
      // Affiliate conditionally added
      // Seller Dashboard conditionally added
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

**Add compact legal footer:**
```typescript
// In the sidebar footer area
<div className="p-2 border-t border-border text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 justify-center">
  <Link to="/terms">Terms</Link>
  <Link to="/privacy">Privacy</Link>
  <Link to="/refunds">Refunds</Link>
</div>
```

**Add persistent Home link at top (non-collapsible):**
```typescript
// Before the scrollable nav groups
<div className="px-2 py-1 border-b border-border">
  <NavLink to="/" className="...">
    <Home className="h-4 w-4" />
    <span>Home</span>
  </NavLink>
</div>
```

---

## Benefits

| Before | After |
|--------|-------|
| 6 groups + categories | 5 groups + categories |
| 22+ clickable items | ~18 items (Legal moved to footer) |
| Mixed personal/shopping | Clear journey: Discover → Shop → Account |
| Legal taking full rows | Compact footer links |
| "Home" group unclear | "My Account" clearly personal |
| Featured buried in "Products" | Featured leads "Discover" section |

---

## Mobile Considerations

The same structure works well for the mobile drawer:
- Top sections (Discover, Shop) are what customers engage with most
- Personal account items are lower but still accessible
- Legal links compressed to footer saves scroll depth

