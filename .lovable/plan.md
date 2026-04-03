
# Eclipse Pro — Full Implementation

## Stripe Products Created
- Product: `prod_UGoAoaZBT4cQMQ`
- Monthly price: `price_1TIGYOCjEHxHwNl933p6yUid` (£7.99/month)
- Annual price: `price_1TIGYiCjEHxHwNl96sljbSjm` (£69.99/year)

## Database Migration

Create `seller_subscriptions` table and add `is_pro`, `pro_badge_enabled` columns to `stores`.

```sql
CREATE TABLE public.seller_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.seller_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own seller subscription" ON public.seller_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS pro_badge_enabled BOOLEAN DEFAULT true;
```

## New Files

### 1. `src/hooks/useSellerSubscription.ts`
Hook that reads from `seller_subscriptions` table, returns `isPro`, `limits`, `subscribe(billingPeriod)`, `openPortal()`, pricing info. Limits object defines Free vs Pro values (commission 15% vs 10%, file size 200MB vs 500MB, images 5 vs 15, products 25 vs unlimited, store pages 1 vs 5, monthly ad credit £0 vs £5).

### 2. `src/pages/seller/SellerProPage.tsx`
Full page at `/seller/pro` with:
- Hero section with Eclipse Pro branding
- Billing toggle (monthly £7.99 / annual £69.99)
- Free vs Pro comparison table with check/cross indicators
- Subscribe button or current status card if already subscribed
- Manage subscription button linking to Stripe portal

## Modified Files

### 3. `src/components/AppRoutes.tsx`
- Add lazy import: `const SellerProPage = lazyWithRetry(() => import("@/pages/seller/SellerProPage"));`
- Add route: `<Route path="/seller/pro" element={<SellerProPage />} />`

### 4. `src/components/seller/SellerSidebar.tsx`
- Import `Crown` icon
- Add `{ title: 'Eclipse Pro', icon: Crown, href: '/seller/pro' }` to `topLevelItems` array (after Store Builder)

### 5. `supabase/functions/create-subscription/index.ts`
Add `getSellerProConfig` handler function:
```typescript
const SELLER_PRO_PRICES = {
  monthly: "price_1TIGYOCjEHxHwNl933p6yUid",
  annual: "price_1TIGYiCjEHxHwNl96sljbSjm",
};

async function getSellerProConfig(supabase, user, body, returnOrigin) {
  const billingPeriod = body.billingPeriod || 'monthly';
  const storeId = body.store_id;
  // Check existing active seller subscription
  const { data: existing } = await supabase.from('seller_subscriptions')
    .select('id').eq('user_id', user.id).eq('status', 'active').maybeSingle();
  if (existing) throw new Error("You already have an active Eclipse Pro subscription.");
  
  const priceId = billingPeriod === 'annual' ? SELLER_PRO_PRICES.annual : SELLER_PRO_PRICES.monthly;
  return {
    priceId,
    lineItems: [{ price: priceId, quantity: 1 }],
    successUrl: `${returnOrigin}/seller/pro?subscription=success`,
    cancelUrl: `${returnOrigin}/seller/pro?subscription=cancelled`,
    metadata: { type: 'seller_pro', user_id: user.id, store_id: storeId || '' },
    subscriptionMetadata: { type: 'seller_pro', user_id: user.id, store_id: storeId || '' },
  };
}
```
Add case to the switch statement: `case 'seller_pro': config = await getSellerProConfig(...); break;`

### 6. `supabase/functions/stripe-subscription-webhook/index.ts`
After the IP Shield handler block (~line 200), add seller_pro detection and handling:
```typescript
// Check if this is a seller_pro subscription
const isSellerPro = subscription.metadata?.type === 'seller_pro';

if (isSellerPro) {
  await handleSellerProSubscription(supabaseAdmin, subscription, userId, customerId, event.type);
  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" }, status: 200 });
}
```

Add handler function:
```typescript
async function handleSellerProSubscription(supabase, subscription, userId, customerId, eventType) {
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  const periodStart = subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null;
  const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;
  const storeId = subscription.metadata?.store_id || null;

  // Upsert seller_subscriptions
  const { data: existing } = await supabase.from('seller_subscriptions')
    .select('id').eq('user_id', userId).maybeSingle();

  const subData = {
    user_id: userId,
    store_id: storeId || null,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    status: isActive ? 'active' : (subscription.status === 'canceled' ? 'cancelled' : subscription.status),
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancelled_at: !isActive ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabase.from('seller_subscriptions').update(subData).eq('id', existing.id);
  } else {
    await supabase.from('seller_subscriptions').insert({ ...subData, created_at: new Date().toISOString() });
  }

  // Update stores.is_pro flag
  if (storeId) {
    await supabase.from('stores').update({ is_pro: isActive }).eq('id', storeId);
  } else {
    // Find store by owner
    const { data: store } = await supabase.from('stores').select('id').eq('owner_id', userId).maybeSingle();
    if (store) await supabase.from('stores').update({ is_pro: isActive }).eq('id', store.id);
  }

  // Update commission rate: Pro gets 10%, free gets default 15%
  // Only if no admin custom_commission_rate is set
  const { data: store } = await supabase.from('stores')
    .select('id, commission_rate, custom_commission_rate, custom_rate_expires_at')
    .eq('owner_id', userId).maybeSingle();
  
  if (store) {
    const hasActiveCustomRate = store.custom_commission_rate !== null && 
      (!store.custom_rate_expires_at || new Date(store.custom_rate_expires_at) > new Date());
    if (!hasActiveCustomRate) {
      await supabase.from('stores').update({ commission_rate: isActive ? 10 : 15 }).eq('id', store.id);
    }
  }

  // Grant £5 ad credit on activation
  if (isActive && eventType.includes('created')) {
    try {
      await supabase.rpc('add_credits', {
        p_user_id: userId, p_amount: 5, p_type: 'subscription_bonus',
        p_description: 'Eclipse Pro monthly ad credit'
      });
    } catch (e) { console.log('Failed to grant ad credit:', e); }
  }

  logStep("Seller Pro subscription handled", { userId, status: isActive ? 'active' : 'inactive' });
}
```

## Summary of Changes
| Action | File |
|--------|------|
| New | `src/hooks/useSellerSubscription.ts` |
| New | `src/pages/seller/SellerProPage.tsx` |
| Modified | `src/components/AppRoutes.tsx` |
| Modified | `src/components/seller/SellerSidebar.tsx` |
| Modified | `supabase/functions/create-subscription/index.ts` |
| Modified | `supabase/functions/stripe-subscription-webhook/index.ts` |
| DB migration | `seller_subscriptions` table + `stores` columns |
