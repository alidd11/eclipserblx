# Tighten Route-Level Permissions on Remaining Admin Pages

## Finding

All four pages **already pass `requiredPermissions` to `AdminLayout`**, so direct URL access is technically gated. Two of them, however, are gated on `view_seller_stores`, which is broader than the action they actually expose. Tightening these brings them in line with the RBAC contract (page guard mirrors action gate).

| Page | Current | Should be |
|---|---|---|
| `SellerProductsAll.tsx` | `['view_seller_stores']` | `['view_products','manage_seller_stores']` (anyOf) |
| `SellerProductReview.tsx` | `['view_seller_stores']` | `['manage_products']` |
| `ModerationQueue.tsx` | `['view_seller_stores']` | `['view_seller_stores']` (no change — correct) |
| `DeveloperSubmissions.tsx` | `['manage_developer_submissions']` | no change — correct |

`AdminLayout`'s `requiredPermissions` is already an OR-check (anyOf) per the existing contract, so passing two values widens for `SellerProductsAll` (browse-only role + store-manager role can both reach it) and narrows `SellerProductReview` to actual product approvers only.

## Changes (2 files)

1. **`src/pages/admin/SellerProductsAll.tsx`** (line 191) — change `requiredPermissions` to `['view_products','manage_seller_stores']`.
2. **`src/pages/admin/SellerProductReview.tsx`** (line 142) — change `requiredPermissions` to `['manage_products']`.

No changes to `ModerationQueue.tsx` or `DeveloperSubmissions.tsx` — already correct.

## Verification

- `tsc --noEmit -p tsconfig.app.json` — must pass.
- Manual: as a role with only `view_seller_stores` (no `manage_products`), navigating directly to `/admin/seller-product-review/:id` should now show "Insufficient permissions".

## Out of Scope

- No RLS changes (server-side enforcement on these tables already gated by `manage_products` / store-team checks per existing memory).
- No new permissions, no UI changes, no sidebar changes.

## Risk

Very low. `SellerProductsAll` becomes strictly more permissive (anyOf widens). `SellerProductReview` becomes strictly more restrictive — only affects users who currently have `view_seller_stores` but not `manage_products`; per current role catalog, this is no one in production (`admin` and `lead_administrator` hold both).
