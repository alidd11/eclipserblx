

## Fix: Stop generating text slugs for products

The routing system already uses numeric `product_number` for all product URLs (e.g. `/products/12345`). But the product editor still generates and saves a text-based slug (e.g. `combat-medic-rp-script-0157a0c`), which is confusing and serves no purpose.

### Changes

**1. `src/pages/seller/SellerProductEditor.tsx`**
- Remove the `generateSlug` function entirely
- Remove the slug auto-generation on name change (line 198)
- Remove the slug fallback with `crypto.randomUUID()` on insert (lines 419-426)
- Remove the slug input field from the form UI
- On insert, set `slug` to a simple deterministic value (lowercase name, hyphenated) just to satisfy the DB column's NOT NULL / unique constraint — no random suffix

**2. `src/pages/seller/SellerProducts.tsx`**
- Remove the `generateSlug` function and all slug auto-generation logic
- Remove the slug input field from the quick-add form

**3. Database cleanup (migration)**
- Run an UPDATE to strip random suffixes from existing product slugs, replacing them with clean name-derived values (with collision suffix only if needed)

This ensures the slug column is a quiet internal identifier, and users only ever see the `product_number` in URLs.

