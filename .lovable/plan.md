
# Plan: Allow Admins to View Scheduled Products

## Current Situation
- **Admin Products page**: Already shows all products including scheduled ones with amber "Scheduled" badges
- **Product Detail page**: Filters out future-scheduled products using `release_at` filter, preventing everyone (including admins) from previewing scheduled products

## What Needs to Change

The Product Detail page (`src/pages/ProductDetail.tsx`) needs to detect if the current user is an admin/staff member and bypass the `release_at` filter for them.

---

## Implementation Details

### 1. Modify Product Detail Page Query

**File:** `src/pages/ProductDetail.tsx`

**Changes:**
- Import and use `useAdminAuth` hook to check if user is staff
- Modify the product query to:
  - For regular users: Keep existing filter (only show released products)
  - For admins/staff: Show all products regardless of `release_at`
- Add a visual banner for admins indicating the product is scheduled (not yet visible to customers)

### 2. Query Logic Update

**Current query (line 57-70):**
```typescript
const { data: product, isLoading } = useQuery({
  queryKey: ['product', slug],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('products')
      .select(`*, categories(name, slug)`)
      .eq('slug', slug)
      .eq('is_active', true)
      .or(`release_at.is.null,release_at.lte.${new Date().toISOString()}`)
      .single();
    if (error) throw error;
    return data;
  },
});
```

**Updated approach:**
```typescript
const { isStaff, loading: adminLoading } = useAdminAuth();

const { data: product, isLoading } = useQuery({
  queryKey: ['product', slug, isStaff],
  queryFn: async () => {
    let query = supabase
      .from('products')
      .select(`*, categories(name, slug)`)
      .eq('slug', slug)
      .eq('is_active', true);

    // Only filter scheduled products for non-staff users
    if (!isStaff) {
      query = query.or(`release_at.is.null,release_at.lte.${new Date().toISOString()}`);
    }

    const { data, error } = await query.single();
    if (error) throw error;
    return data;
  },
  enabled: !adminLoading, // Wait for role check
});
```

### 3. Add Visual Indicator for Scheduled Products

When a staff member views a scheduled product, show a prominent banner:

```tsx
{isStaff && product?.release_at && new Date(product.release_at) > new Date() && (
  <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4 mb-6 flex items-center gap-3">
    <Clock className="h-5 w-5 text-amber-500" />
    <div>
      <p className="font-medium text-amber-600 dark:text-amber-400">
        Scheduled Product (Admin Preview)
      </p>
      <p className="text-sm text-muted-foreground">
        This product is scheduled to release on {new Date(product.release_at).toLocaleString()}. 
        It is not visible to customers yet.
      </p>
    </div>
  </div>
)}
```

### 4. Update Related Products Query

The related products query also needs the same logic to show scheduled related products to admins:

**File:** `src/pages/ProductDetail.tsx` (line 72-88)

Update to conditionally include scheduled products for staff users.

---

## Technical Notes

- The `useAdminAuth` hook is already available at `src/hooks/useAdminAuth.tsx`
- The `isStaff` property checks if the user has any admin role
- Query key includes `isStaff` to ensure proper cache separation between admin and customer views
- The `enabled: !adminLoading` ensures we wait for role verification before fetching

## Files to Modify
1. `src/pages/ProductDetail.tsx` - Main changes for admin bypass and visual indicator

## Summary
This update allows admins and staff to preview scheduled products on the customer-facing product detail page while maintaining the restriction for regular customers. A clear visual banner will indicate when a product is being viewed in "admin preview" mode.
