
# Fix Marketplace Categories to Only Show Marketplace Products

## Problem
The Categories card on the Marketplace page currently shows product counts that include the main Eclipse store. As shown in your screenshot:
- "3D Models" shows 22 items (includes Eclipse store products)
- "Bots" shows 1 item (includes Eclipse store products)

When clicking these categories, users are taken to pages showing all products instead of just marketplace products.

---

## Solution Overview

| Component | Current Issue | Fix |
|-----------|---------------|-----|
| Categories Card counts | Counts all products | Only count products with `store_id` (marketplace) |
| Category links | Go to `/products?category=X` | Add `&source=marketplace` parameter |
| "View all" link | Goes to `/categories` | Go to `/categories?source=marketplace` |
| Products page | No source filtering | Filter by `store_id` when `source=marketplace` |
| Categories page | No source filtering | Pass through source parameter to links |

---

## Files to Update

### 1. CategoriesGridCard.tsx
Update the marketplace categories component to:
- Filter product counts to only include marketplace products (where `store_id IS NOT NULL`)
- Add `source=marketplace` to all navigation links

### 2. Products.tsx  
Add support for the `source=marketplace` query parameter:
- Read the `source` parameter from URL
- When `source=marketplace`, add `.not('store_id', 'is', null)` to the query
- This excludes Eclipse store products (which have no `store_id`)

### 3. Categories.tsx
Update the full categories page to:
- Read `source` parameter from URL
- When `source=marketplace`, filter product counts to marketplace-only
- Pass `source=marketplace` through to product links

---

## Technical Details

### Query Change for Marketplace-Only Products
```typescript
// Current (counts ALL products)
const { count } = await supabase
  .from('products')
  .select('id', { count: 'exact', head: true })
  .eq('category_id', category.id)
  .eq('is_active', true);

// Fixed (counts only marketplace products)
const { count } = await supabase
  .from('products')
  .select('id', { count: 'exact', head: true })
  .eq('category_id', category.id)
  .eq('is_active', true)
  .not('store_id', 'is', null);  // Excludes Eclipse store
```

### Link Updates
```typescript
// Current
<Link to={`/products?category=${category.slug}`}>
<Link to="/categories">

// Fixed
<Link to={`/products?category=${category.slug}&source=marketplace`}>
<Link to="/categories?source=marketplace">
```

### Products Page Filter
```typescript
const sourceFilter = searchParams.get('source');

// In the query function:
if (sourceFilter === 'marketplace') {
  query = query.not('store_id', 'is', null);
}
```

---

## Expected Result
After these changes:
- Categories card will show accurate counts for marketplace products only
- Clicking a category navigates to `/products?category=X&source=marketplace`
- The products page will only display marketplace seller products
- "View all" will show marketplace-filtered categories
