
# Plan: Sync Main Store Products to Eclipse Marketplace Store

## Overview

This plan implements automatic synchronization so that whenever a product is uploaded via the Admin Products page (main store), it also gets linked to the Eclipse Store in the marketplace. This ensures the same products appear both in the main catalog and under the Eclipse Store.

## Current Architecture

| Store Type | `store_id` | `is_seller_product` | Where Managed |
|------------|------------|---------------------|---------------|
| Main Store | `NULL` | `false` | Admin → Products |
| Eclipse Store (Marketplace) | `83b5dde6-...` | `true` | Should auto-sync |

The Eclipse Store ID is: `83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a`

## Implementation Approach

Rather than duplicating products (which would create data inconsistency), we'll modify the admin product save logic to **optionally link main store products to the Eclipse Store** by setting their `store_id` to the Eclipse Store ID while keeping `is_seller_product = false` to distinguish them from community seller uploads.

---

## Technical Changes

### 1. Update Admin Products Page

**File:** `src/pages/admin/Products.tsx`

Add a setting/toggle for "Sync to Eclipse Marketplace Store" when creating/editing products:

- Add a new form field `sync_to_marketplace: boolean` (default: `true`)
- When saving a product with this option enabled, set:
  - `store_id = '83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a'` (Eclipse Store ID)
  - `moderation_status = 'approved'` (auto-approved since it's from admin)
  - Keep `is_seller_product = false` to identify it as an official product

**Key code changes in `saveMutation`:**

```typescript
const ECLIPSE_STORE_ID = '83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a';

const payload = {
  // ... existing fields
  store_id: data.sync_to_marketplace ? ECLIPSE_STORE_ID : null,
  moderation_status: 'approved',
  is_seller_product: false, // Distinguishes from community seller products
};
```

### 2. Add Marketplace Sync Toggle to Product Form

Add a UI toggle in the product creation/edit dialog:

```text
┌─────────────────────────────────────────────────────┐
│ ☑️ Sync to Eclipse Marketplace Store                │
│    This product will appear in the marketplace      │
│    under the Eclipse Store                          │
└─────────────────────────────────────────────────────┘
```

### 3. Update Product Form Interface

**Add new field to `ProductForm` interface:**

```typescript
interface ProductForm {
  // ... existing fields
  sync_to_marketplace: boolean;
}
```

**Update `emptyForm` default:**

```typescript
const emptyForm: ProductForm = {
  // ... existing fields
  sync_to_marketplace: true, // Default to syncing
};
```

### 4. Handle Product Updates

When editing an existing product:
- If `sync_to_marketplace` is toggled ON: Set `store_id` to Eclipse Store ID
- If `sync_to_marketplace` is toggled OFF: Set `store_id` to `null`

This ensures products can be added/removed from the marketplace after creation.

### 5. Populate Form on Edit

When loading a product for editing, check if it's linked to the Eclipse Store:

```typescript
sync_to_marketplace: product.store_id === ECLIPSE_STORE_ID
```

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/Products.tsx` | Add sync toggle, update form interface, modify save logic to set `store_id` |

---

## Benefits

- **No Data Duplication**: Single product record serves both main store and marketplace
- **Easy Management**: Toggle on/off from admin panel
- **Consistent Data**: Changes to products automatically reflect everywhere
- **Backward Compatible**: Existing products remain unchanged until edited
