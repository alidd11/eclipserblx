

## Problem

The **"Pending Moderation"** alert in the admin dashboard's "Needs Attention" section links to `/admin/products`, but that page **only shows admin-managed products** (filtered by `is_seller_product = false`). The pending moderation items are almost certainly **seller products**, which live on a different page (`/admin/seller-product-review`).

So clicking "Pending Moderation" takes you to a page where you literally can't see the flagged items.

## Root Cause

In `SystemAlerts.tsx`, the "Pending Moderation" alert queries **all** products with `moderation_status = 'pending'` but its `href` points to `/admin/products` instead of `/admin/seller-product-review`.

Meanwhile, there's already a **separate** "Seller Product Reviews" alert that queries `developer_product_submissions` (a different table entirely), so these aren't duplicates.

## Fix

**Change the `href` for the "Pending Moderation" alert** from `/admin/products` to `/admin/seller-product-review`, since that's where pending moderation items are actually visible and actionable.

Optionally, we could also refine the query to only count `is_seller_product = true` pending items, since admin products are auto-approved. This would make the count more accurate and prevent false alerts from admin-managed products.

### File: `src/components/admin/dashboard/SystemAlerts.tsx`
- Line 58: Change `href: '/admin/products'` → `href: '/admin/seller-product-review'`
- Line 33: Optionally add `.eq('is_seller_product', true)` to the pending moderation query for accuracy

One small change, very low risk.

