
# Eclipse Pro — Full Implementation

## Overview
Implement a seller-focused subscription called **Eclipse Pro** (£7.99/month, £69.99/year) giving sellers: reduced 10% commission, higher limits, monthly £5 ad credit, PRO badge, and priority perks. Completely separate from Eclipse+ (buyer subscription).

## Step 1: Create Stripe Products & Prices

Create one Stripe product "Eclipse Pro" with two prices:
- Monthly: £7.99/month (GBP, recurring monthly)
- Annual: £69.99/year (GBP, recurring yearly)

## Step 2: Database Migration

**New table: `seller_subscriptions`**
```sql
CREATE TABLE public.seller_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive', -- active, inactive, cancelled, past_due
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.seller_subscriptions ENABLE ROW LEVEL SECURITY;
-- Users can read their own
CREATE POLICY "Users can read own seller subscription" ON public.seller_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
```

**Add columns to `stores`:**
```sql
ALTER TABLE public.stores ADD COLUMN is_pro BOOLEAN DEFAULT false;
ALTER TABLE public.stores ADD COLUMN pro_badge_enabled BOOLEAN DEFAULT true;
```

## Step 3: Edge Function — `create-subscription` Update

Add a new `seller_pro` product type handler in the existing `create-subscription/index.ts`:
- Uses the hardcoded Stripe price IDs from Step 1
- Checks existing seller subscription to prevent duplicates
- Sets metadata `{ type: 'seller_pro', user_id, store_id }`
- Success URL: `/seller/pro?subscription=success`
- Cancel URL: `/seller/pro?subscription=cancelled`

## Step 4: Edge Function — `stripe-subscription-webhook` Update

Add seller_pro handling in the webhook (similar to Global Guard / IP Shield pattern):
- Detect via `subscription.metadata.type === 'seller_pro'`
- On `customer.subscription.created/updated` with status `active`: upsert `seller_subscriptions` row, set `stores.is_pro = true`
- On `customer.subscription.deleted` or status `cancelled`: update `seller_subscriptions.status = 'cancelled'`, set `stores.is_pro = false`
- Grant monthly £5 ad credit on first activation (using existing `add_credits` function)

## Step 5: Frontend Hook — `useSellerSubscription.ts`

New hook at `src/hooks/useSellerSubscription.ts`:
- Reads from `seller_subscriptions` table (fast DB path, no edge function)
- Returns `{ isPro, subscriptionEnd, isLoading, subscribe(billingPeriod), limits }`
- `subscribe()` calls `supabase.functions.invoke('create-subscription', { body: { product_type: 'seller_pro', billingPeriod } })`
- Limits object returns dynamic values based on Pro status:

| Benefit | Free | Pro |
|---------|------|-----|
| Commission | 15% | 10% |
| Max file size | 200MB | 500MB |
| Max images | 5 | 15 |
| Product limit | 25 | Unlimited |
| Store pages | 1 | 5 |
| Monthly ad credit | — | £5 |
| PRO badge | No | Yes |

## Step 6: Seller Pro Page — `src/pages/seller/SellerProPage.tsx`

New page at route `/seller/pro`:
- Free vs Pro comparison table with check/cross indicators
- Subscribe button (monthly/annual toggle) if not subscribed
- Current status card with manage/cancel if subscribed
- Pricing cards showing £7.99/mo or £69.99/yr (save ~27%)

## Step 7: Sidebar & Route Integration

**`SellerSidebar.tsx`**: Add "Eclipse Pro" nav item with Crown icon as a top-level item (below Store Builder)

**`AppRoutes.tsx`**: Add route `<Route path="/seller/pro" element={<SellerProPage />} />`

## Step 8: Commission Override

Update the checkout/order processing edge functions to check `stores.is_pro`:
- If `is_pro = true` and no `custom_commission_rate` set by admin, use 10% instead of default 15%
- Admin `custom_commission_rate` always takes priority

## Step 9: Store PRO Badge

Update `StorePage.tsx` to show a "PRO" badge next to the store name when `stores.is_pro` is true and `pro_badge_enabled` is true.

## Files Summary

| Action | File |
|--------|------|
| New | `src/hooks/useSellerSubscription.ts` |
| New | `src/pages/seller/SellerProPage.tsx` |
| Modified | `src/components/seller/SellerSidebar.tsx` — add Pro nav item |
| Modified | `src/components/AppRoutes.tsx` — add /seller/pro route |
| Modified | `supabase/functions/create-subscription/index.ts` — add seller_pro handler |
| Modified | `supabase/functions/stripe-subscription-webhook/index.ts` — handle seller_pro events |
| DB migration | New `seller_subscriptions` table + `stores` columns |
| Stripe | Create product + 2 prices |

## Not Changed
- Eclipse+ (buyer subscription) — completely separate
- Discord ads system
- Admin analytics
