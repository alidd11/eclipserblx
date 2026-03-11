

## Root Cause Found: `seller_agreements` RLS blocks anonymous visitors

The subdomain resolution is working correctly. The actual "Store Not Found" error comes from **StorePage.tsx**, not from `StoreStandalonePage`.

### The Bug

In `StorePage.tsx` (lines 121-133), after fetching the store, the code checks if the seller has signed the Terms of Service:

```typescript
const { data: agreement } = await supabase
  .from('seller_agreements')
  .select('id')
  .eq('store_id', data.id)
  .eq('agreement_version', '1.0')
  .maybeSingle();

if (!agreement) {
  throw new Error('Store agreement not signed');
}
```

The `seller_agreements` table has RLS policies that **only allow authenticated store owners or staff** to read agreements. Anonymous visitors (anyone not logged in) get zero rows back, so `agreement` is always `null`, and the store page throws an error every time.

The agreement **does exist** in the database (signed on Feb 26, 2026), but RLS prevents unauthenticated users from seeing it.

### Fix

**1. Add a database migration** -- Create a new RLS policy on `seller_agreements` allowing public SELECT access for active, approved stores:

```sql
CREATE POLICY "Public can check agreement existence"
ON public.seller_agreements
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = seller_agreements.store_id
      AND stores.status = 'approved'
      AND stores.is_active = true
  )
);
```

This is safe because the `seller_agreements` table only contains the store_id, agreement version, and a timestamp -- no sensitive data.

**2. No code changes needed** -- `StorePage.tsx` logic is correct once RLS allows the read.

### Why this affects subdomains specifically

It actually affects ALL unauthenticated users on ALL store pages, but the subdomain flow makes it more visible because those visitors are almost always anonymous. On the main site, users may already be logged in, masking the issue.

