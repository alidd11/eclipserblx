
# Marketplace Categories - Show Only Marketplace Products

## Your Request
Update the Categories card on the Marketplace page so it only shows products from marketplace stores (like clearlydev), excluding products from the main Eclipse store.

---

## What Will Change

| Current Behavior | New Behavior |
|------------------|--------------|
| Category counts include ALL products | Counts only products from marketplace stores |
| Links go to `/products?category=X` (shows all products) | Links go to `/products?category=X&source=marketplace` |
| "View all" goes to `/categories` | "View all" goes to `/categories?source=marketplace` |

---

## Implementation

### 1. Update CategoriesGridCard Component
**File:** `src/components/marketplace/CategoriesGridCard.tsx`

- Modify the product count query to only count products where `store_id` is NOT null (marketplace products only)
- Update category links to include `&source=marketplace` parameter
- Update "View all" link to include `?source=marketplace`

```typescript
// Updated count query - only marketplace products
const { count } = await supabase
  .from('products')
  .select('id', { count: 'exact', head: true })
  .eq('category_id', category.id)
  .eq('is_active', true)
  .not('store_id', 'is', null)  // Only marketplace products
  .or(`release_at.is.null,release_at.lte.${now}`);

// Updated links
<Link to={`/products?category=${category.slug}&source=marketplace`}>
<Link to="/categories?source=marketplace">
```

### 2. Update Products Page to Handle Source Filter
**File:** `src/pages/Products.tsx`

- Read new `source` query parameter
- When `source=marketplace`, filter to only show products with a `store_id` (excluding main store)

```typescript
const sourceFilter = searchParams.get('source');

// In query function:
if (sourceFilter === 'marketplace') {
  query = query.not('store_id', 'is', null);
}
```

### 3. Update Categories Page (Optional)
**File:** `src/pages/Categories.tsx`

- Pass through the `source=marketplace` parameter to product links
- Update product counts to respect the source filter

---

## Summary

| File | Changes |
|------|---------|
| `CategoriesGridCard.tsx` | Filter counts to marketplace-only, update links |
| `Products.tsx` | Add `source=marketplace` filter support |
| `Categories.tsx` | Pass through source filter (optional) |

This ensures when users browse categories from the Marketplace page, they only see products from marketplace sellers like clearlydev, not from the main Eclipse store.
