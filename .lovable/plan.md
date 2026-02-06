

# Pagination and Query Optimization for Customer and Seller Pages

This plan extends the performance optimizations we just implemented for admin pages to both customer-facing pages and the seller dashboard, ensuring the entire platform scales smoothly as data grows.

---

## Overview

The same optimizations that improved admin pages will be applied to:

**Seller Dashboard Pages:**
- SellerOrders - transactions list
- SellerProducts - product catalog
- SellerReviews - customer reviews
- SellerMessages - conversation list

**Customer Pages:**
- MyPurchases - already has client-side pagination (will optimize with server-side)
- StorePage - product listings on store pages
- Wishlist - saved products list

---

## What This Means for Your Users

### Before Optimization
- **Seller with 500+ orders**: Page loads slowly, browser may freeze when viewing transaction history
- **Store with 200+ products**: Store page takes 3-5 seconds to load all products
- **Customer with 100+ wishlist items**: Wishlist page becomes sluggish

### After Optimization
- **Consistent ~100ms load times** regardless of how much data exists
- **Smooth scrolling** through large lists with Previous/Next navigation
- **Reduced mobile data usage** by loading only what's needed

---

## Implementation Plan

### Phase 1: Seller Dashboard Pages

**1. SellerOrders.tsx (Transactions)**

Currently fetches ALL transactions at once:
```text
.from('seller_transactions')
.select('*')
.eq('store_id', store.id)  // No limit!
```

Will add:
- Server-side pagination (20 per page)
- Total count query for navigation
- Previous/Next buttons
- Cache with 30-second staleTime

**2. SellerProducts.tsx**

Currently loads entire product catalog. Will add:
- Pagination (12 products per page for grid layout)
- Maintain search functionality with pagination reset

**3. SellerReviews.tsx**

Fetches all reviews without limits. Will add:
- Server-side pagination (15 per page)
- Preserve filter/sort with pagination
- Optimize the nested product query to avoid loading all products

**4. SellerMessages.tsx**

Has a performance issue - runs individual queries per conversation:
```text
await Promise.all(
  (data || []).map(async (conv) => {
    // Individual query per conversation!
  })
)
```

Will optimize:
- Batch profile fetches using `.in()` instead of individual queries
- Add pagination for conversations (10 per page)
- Add 30-second staleTime

---

### Phase 2: Customer Pages

**1. MyPurchases.tsx**

Already has client-side pagination, but loads ALL orders first. Will convert to:
- Server-side pagination with `.range()`
- Separate queries for each tab (Products vs Orders)

**2. StorePage.tsx**

Currently fetches all store products:
```text
.from('products')
.select('*, categories(...)')
.eq('store_id', store.id)  // All products!
```

Will add:
- Server-side pagination (8 desktop / 4 mobile per page - already has swipe support)
- Total count for page indicators
- Preserve tab/category filtering with pagination

**3. Wishlist.tsx**

Loads all wishlist items. Will add:
- Server-side pagination (10 per page)
- Total count display

---

## Technical Details

### Query Changes Pattern

Each page will follow this pattern:

```text
// Add pagination state
const [currentPage, setCurrentPage] = useState(1);
const ITEMS_PER_PAGE = 20;

// Update query with range and count
const { data, isLoading } = useQuery({
  queryKey: ['items', storeId, currentPage],
  queryFn: async () => {
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    const { data, count, error } = await supabase
      .from('table')
      .select('*', { count: 'exact' })
      .range(from, to);
      
    return { items: data, totalCount: count };
  },
  staleTime: 30000, // 30 seconds cache
});
```

### UI Components

Will add pagination controls consistent with admin pages:
- Page counter showing current/total
- Previous/Next buttons
- Disabled states at boundaries

---

## Expected Impact

| Page | Before | After |
|------|--------|-------|
| SellerOrders | Loads all transactions | 20 per page |
| SellerProducts | Loads all products | 12 per page |
| SellerReviews | Loads all reviews | 15 per page |
| SellerMessages | N+1 queries per conversation | Batched, 10 per page |
| MyPurchases | Client-side pagination | True server-side |
| StorePage | All products | 4-8 per page (swipeable) |
| Wishlist | All items | 10 per page |

---

## Files to Modify

1. `src/pages/seller/SellerOrders.tsx` - Add pagination + caching
2. `src/pages/seller/SellerProducts.tsx` - Add pagination + caching
3. `src/pages/seller/SellerReviews.tsx` - Add pagination + optimize queries
4. `src/pages/seller/SellerMessages.tsx` - Batch queries + pagination
5. `src/pages/MyPurchases.tsx` - Convert to server-side pagination
6. `src/pages/StorePage.tsx` - Add server-side pagination
7. `src/pages/Wishlist.tsx` - Add pagination

---

## Implementation Order

1. **Seller pages first** - These are more likely to have large datasets as sellers accumulate orders/products
2. **StorePage** - High-traffic customer page
3. **MyPurchases & Wishlist** - Customer account pages

All changes will maintain existing functionality (search, filters, sorting) while adding pagination as an enhancement.

