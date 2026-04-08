

# Payouts Not Appearing — Root Cause & Fix

## Problem
Every payout-related table and view in the database has **zero role grants** for the `authenticated` role. This means all client-side queries (PostgREST/Supabase JS) silently return empty arrays — no errors, just no data. This affects:

- `seller_payouts` — admin management + seller balance page
- `seller_payouts_safe` — seller dashboard timeline + tax summary
- `affiliate_payouts` — affiliate payout requests
- `affiliate_payouts_safe` / `affiliate_payouts_masked` — affiliate views
- `seller_payouts_masked` — admin masked view
- `developer_payments` — developer payment cards

RLS policies exist and are correct (sellers see own payouts, staff with `manage_payouts` see all), but without `GRANT SELECT/INSERT/UPDATE` the RLS policies never even get evaluated.

## Fix

A single migration that grants proper permissions on all payout tables and views:

```sql
-- Base tables (have RLS policies already)
GRANT SELECT, INSERT ON public.seller_payouts TO authenticated;
GRANT UPDATE ON public.seller_payouts TO authenticated;

GRANT SELECT, INSERT ON public.affiliate_payouts TO authenticated;
GRANT UPDATE ON public.affiliate_payouts TO authenticated;

GRANT SELECT ON public.developer_payments TO authenticated;
GRANT UPDATE ON public.developer_payments TO authenticated;

-- Safe/masked views (read-only for sellers)
GRANT SELECT ON public.seller_payouts_safe TO authenticated;
GRANT SELECT ON public.seller_payouts_masked TO authenticated;
GRANT SELECT ON public.affiliate_payouts_safe TO authenticated;
GRANT SELECT ON public.affiliate_payouts_masked TO authenticated;
```

The existing RLS policies already handle access control:
- Sellers: `auth.uid() = seller_id` for SELECT/INSERT
- Staff: `has_permission(auth.uid(), 'manage_payouts')` for ALL operations

No code changes needed — the queries are correct, they just need the database permissions to actually execute.

## Scope
| Item | Change |
|------|--------|
| New migration | GRANT statements for 8 tables/views |
| Code changes | None |
| Risk | Low — RLS already enforced, grants just unlock the door |

