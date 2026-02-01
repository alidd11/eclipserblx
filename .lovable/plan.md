
# Navigation Improvements Between Main Website and Seller Stores

## Current Architecture Analysis

The platform currently has two distinct navigation experiences:

1. **Main Website (MainLayout)**: Uses `CustomerSidebar` with a hierarchical structure (Quick Access → Discover → Browse → Community → My Account → Help)

2. **Seller Store Pages (StoreLayout)**: Uses a separate `StoreSidebar` with store-specific navigation (Home, About, Categories, Legal links, "Browse All Stores" footer button)

**Current Pain Points:**
- No persistent way to return to a recently visited store from the main site
- Switching between store pages and main marketplace requires multiple clicks
- Store sidebar has no visual connection to the main navigation system
- No "breadcrumb trail" showing context when deep in a store

---

## Proposed Navigation Improvements

### 1. Recently Visited Stores Section in Customer Sidebar
Add a collapsible "Recent Stores" group to the main `CustomerSidebar` that tracks and displays the last 3-5 stores the user visited.

**Implementation:**
- Store visit history in localStorage (keyed by store slug)
- Display store logo + name in sidebar with accent color indicator
- Limit to 5 most recent, auto-expire after 7 days
- Click navigates directly to store page

### 2. Universal "Back to Marketplace" Button in Store Layout
Add a prominent, persistent button in the `StoreLayout` header that provides one-click return to the main marketplace.

**Implementation:**
- Position left of store branding in header
- Uses Eclipse branding/colors for consistency
- Tooltip: "Return to Eclipse Marketplace"

### 3. Contextual Breadcrumb Navigation
Add a subtle breadcrumb bar below the main header when viewing store pages that shows the navigation path.

**Example:** `Eclipse > Stores > [Store Name] > [Category Name]`

**Implementation:**
- Appears only on store pages
- Uses existing breadcrumb components from `src/components/ui/breadcrumb.tsx`
- Links back to marketplace and store home

### 4. Followed Stores Quick Access
For logged-in users, add a "My Stores" or "Following" section in the Customer Sidebar that shows stores they follow.

**Implementation:**
- Fetch from `store_follows` table
- Display up to 5 followed stores with logos
- "View All" link to dedicated followed stores page
- Real-time badge for new products from followed stores (optional)

### 5. Unified Header Appearance
Harmonize the visual appearance of store headers with the main site header for a more seamless experience.

**Implementation:**
- Add Eclipse logo/branding element to store header (small, non-intrusive)
- Maintain store's accent color but include marketplace context
- Consider a "Powered by Eclipse" badge that links home

---

## Technical Implementation Details

### Files to Create
```
src/hooks/useRecentStores.ts        - Hook to manage localStorage-based recent store history
src/components/sidebar/RecentStoresSection.tsx - UI component for recent stores in sidebar
src/components/sidebar/FollowedStoresSection.tsx - UI component for followed stores
src/components/store/MarketplaceBreadcrumb.tsx - Breadcrumb for store context
```

### Files to Modify
```
src/components/layout/CustomerSidebar.tsx
  - Add RecentStoresSection after Quick Access group
  - Add FollowedStoresSection for logged-in users

src/components/store/StoreLayout.tsx
  - Add "Back to Eclipse" button in header
  - Integrate MarketplaceBreadcrumb component
  - Add small Eclipse branding element

src/components/store/StoreSidebar.tsx
  - Update "Browse All Stores" to match main sidebar styling
  - Add Eclipse branding in footer
```

### Data Flow
```text
┌─────────────────────────────────────────────────────────────┐
│                     User Navigation                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Main Site (CustomerSidebar)                                │
│   ┌──────────────────────┐                                   │
│   │ Quick Access         │                                   │
│   │ ├─ Home              │                                   │
│   │ └─ Seller Dashboard  │                                   │
│   │                      │                                   │
│   │ Recent Stores ←──────┼──── localStorage (last 5 visits) │
│   │ ├─ Store A           │                                   │
│   │ ├─ Store B           │                                   │
│   │ └─ Store C           │                                   │
│   │                      │                                   │
│   │ Following ←──────────┼──── store_follows table          │
│   │ ├─ Followed Store 1  │                                   │
│   │ └─ Followed Store 2  │                                   │
│   │                      │                                   │
│   │ Discover             │                                   │
│   │ └─ Marketplace ──────┼───→ /marketplace                 │
│   └──────────────────────┘                                   │
│              │                                                │
│              ▼                                                │
│   Store Page (StoreLayout)                                   │
│   ┌──────────────────────────────────────────┐               │
│   │ [Eclipse] ← Back │ Store Header          │               │
│   ├──────────────────────────────────────────┤               │
│   │ Eclipse > Stores > Store Name            │ ← Breadcrumb  │
│   ├──────────────────────────────────────────┤               │
│   │ StoreSidebar │ Store Content             │               │
│   │ ├─ Home      │                           │               │
│   │ ├─ About     │ Records visit to          │               │
│   │ ├─ Categories│ localStorage ─────────────┼──→ Recent    │
│   │ └─ Legal     │                           │     Stores    │
│   └──────────────────────────────────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Priority Order

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 1 | Universal "Back to Marketplace" button | Low | High |
| 2 | Recently Visited Stores section | Medium | High |
| 3 | Contextual Breadcrumb navigation | Low | Medium |
| 4 | Followed Stores Quick Access | Medium | Medium |
| 5 | Unified Header Appearance | Low | Low |

---

## User Experience Benefits

- **Reduced Friction**: One-click return to marketplace from any store page
- **Context Awareness**: Breadcrumbs show where users are in the navigation hierarchy
- **Personalization**: Recent and followed stores create a customized browsing experience
- **Consistency**: Unified visual language between main site and store pages
- **Discovery**: Easy access to previously browsed stores encourages repeat visits
