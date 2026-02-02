

## Overview

Adding a second admin-controlled store called "Vino" alongside the existing "Eclipse Store". Both stores will be managed from the admin dashboard, and all payments will continue to be received by Eclipse (no commission splitting). The key change is replacing the current on/off toggle with a store selector dropdown.

## What This Achieves

- Admins can choose which store (Eclipse Store or Vino) a product appears under
- Each store has its own branding (logo, name, badges) displayed on product cards
- Products from both stores remain read-only in the seller dashboard
- All revenue goes to Eclipse - no changes to payment flow

## Implementation Steps

### Step 1: Create the Vino Store in the Database

Insert a new store record with the same owner as Eclipse Store, marked as verified and trusted:

```text
+------------------+----------------------------------------+
| Field            | Value                                  |
+------------------+----------------------------------------+
| name             | Vino                                   |
| slug             | vino                                   |
| owner_id         | (same as Eclipse Store owner)          |
| is_verified      | true                                   |
| is_trusted       | true                                   |
| is_active        | true                                   |
| payout_method    | stripe (required field)                |
+------------------+----------------------------------------+
```

### Step 2: Add Vino Store Constant

Update `src/lib/constants.ts` to add:
- `VINO_STORE_ID` constant with the new store's UUID
- `ADMIN_MANAGED_STORES` array containing both store IDs for easy checking

### Step 3: Update Admin Products Form

Modify `src/pages/admin/Products.tsx`:

**Form State Changes:**
- Replace `sync_to_marketplace: boolean` with `marketplace_store: string | null`
- Store ID values: `null` (no store), Eclipse Store ID, or Vino Store ID

**UI Changes:**
- Replace the simple toggle with a dropdown selector:
  - "None" - Product not linked to any marketplace store
  - "Eclipse Store" - Links to Eclipse Store
  - "Vino" - Links to Vino store
- Update the save logic to use the selected store ID

### Step 4: Update Seller Dashboard Protection

Modify `src/pages/seller/SellerProducts.tsx`:
- Update `isEclipseProduct` function to check against `ADMIN_MANAGED_STORES` array
- This ensures Vino products are also protected from seller edits

### Step 5: Product Display (No Changes Needed)

The ProductCard already joins to the `stores` table and displays:
- Store name
- Store logo  
- Verified/Trusted badges

This will automatically work for Vino products once they're linked.

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/constants.ts` | Add `VINO_STORE_ID` and `ADMIN_MANAGED_STORES` |
| `src/pages/admin/Products.tsx` | Replace toggle with store selector dropdown |
| `src/pages/seller/SellerProducts.tsx` | Update admin-managed store check |

### Database Migration

One INSERT statement to create the Vino store with required fields.

### Form Field Mapping

```text
Current:
  sync_to_marketplace: true  → store_id = ECLIPSE_STORE_ID
  sync_to_marketplace: false → store_id = null

New:
  marketplace_store: "eclipse" → store_id = ECLIPSE_STORE_ID
  marketplace_store: "vino"    → store_id = VINO_STORE_ID  
  marketplace_store: null      → store_id = null
```

### Backward Compatibility

Existing products with `store_id = ECLIPSE_STORE_ID` will continue to work. The edit form will pre-select "Eclipse Store" when loading these products.

