

# Import Quota System: Free Allowance + Eclipse Credits

## Overview
Give sellers a monthly free import quota (e.g. 25 products). Once exhausted, each additional import deducts from their Eclipse Credits balance. The existing `credit_balances` and `add_credits`/`spend_credits` DB functions will handle the billing side.

## How It Works

1. **Discovery scan (listing)** — Free, always. This only costs 1-4 Firecrawl credits and is needed to show products before any commitment.
2. **Individual product import** — Each product imported counts against the monthly quota. After the free allowance is used, 1 Eclipse Credit is deducted per product.

```text
Seller opens Import → Scans store (free)
  → Selects 30 products to import
    → First 25: free (monthly quota)
    → Remaining 5: 5 Eclipse Credits deducted
```

## Database Changes

**New table: `seller_import_quotas`**
- `id`, `store_id` (unique per store), `month` (text, e.g. "2026-03"), `imports_used` (int, default 0), `free_limit` (int, default 25), `created_at`
- Unique constraint on `(store_id, month)`
- RLS: store owners + team members can read their own

## Edge Function Changes

**`import-external-products`** — on the `details` action:
- Query `seller_import_quotas` for the current month
- If `imports_used < free_limit`: increment counter, proceed
- If over quota: call `spend_credits(user_id, 1, 'Product import')` — if returns false (insufficient balance), return error
- Track usage after successful import only (don't charge on failures)

## Frontend Changes

**ImportSetupStep / ImportSelectStep:**
- Show remaining free imports: "You have 18/25 free imports remaining this month"
- When selecting more products than remaining free quota, show: "12 free + 8 at 1 credit each (8 credits total)"
- If insufficient credits, disable the import button with a message linking to buy credits

**ImportProgressStep:**
- No changes needed — quota is checked per-product server-side

## Key Details
- Eclipse+ subscribers could optionally get a higher free limit (e.g. 50/month) — can be added later
- Failed imports don't consume quota (only deducted on success)
- The listing/discovery scan remains free to encourage usage
- Monthly quota resets automatically via the month key

