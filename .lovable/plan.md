
# Auto-Approve Imported Products

## Problem
The product import flow hardcodes all imported products to `moderation_status: 'pending'` and `is_active: false`, causing them to appear in the admin review queue even though they have no security flags. This contradicts the platform's auto-approval system which approves clean products automatically.

## Why This Is Safe
Imported products contain only metadata (name, price, description, images from the source store). They have **no uploaded files** at import time, so there is nothing to scan for NSFW content or Lua security risks. The actual security scan should happen later when the seller uploads product files.

## Solution
Update the import edge function to set imported products as `approved` and `is_active: true` by default, so sellers can immediately see them and start uploading files.

## Technical Changes

### File: `supabase/functions/import-external-products/index.ts`

In both the `details` and `bulk-details` actions, change the product insert from:

```typescript
is_active: false,
moderation_status: 'pending',
```

to:

```typescript
is_active: true,
moderation_status: 'approved',
```

This applies to the two `.insert()` calls that create product records during import.

### Redeploy
Redeploy the `import-external-products` edge function after the change.

### Existing Products
Run a data update to fix the 14 currently stuck products:

```sql
UPDATE products
SET moderation_status = 'approved', is_active = true
WHERE is_seller_product = true
  AND moderation_status = 'pending'
  AND moderation_flags IS NULL;
```

This only approves products that have no flags — any genuinely flagged products remain pending for manual review.
