
# Fix Marketplace Access for Seller Applications

## Problem Summary
When users click on "Marketplace", nothing happens because they are silently redirected to the homepage. This is caused by a Row-Level Security (RLS) policy restriction that prevents regular users from reading the `marketplace_public` setting.

## Root Cause Analysis
1. The `settings` table has RLS enabled with a policy that only allows public read access to specific whitelisted keys
2. The `marketplace_public` key is **not** in this whitelist
3. When regular users query for this setting, they get an empty result
4. The `useMarketplaceAccess` hook then calculates `hasAccess = false` for non-admins/non-sellers
5. The Marketplace page redirects them home before they can see the application form

## Solution

### Database Change
Update the RLS policy on the `settings` table to include `marketplace_public` in the list of publicly readable keys.

```sql
-- Drop existing public read policy and recreate with marketplace_public included
DROP POLICY IF EXISTS "Allow public read for specific keys" ON public.settings;

CREATE POLICY "Allow public read for specific keys" ON public.settings
  FOR SELECT
  USING (
    key IN (
      'discord_widget_server_id',
      'discord_invite_url', 
      'store_name',
      'roblox_game_url',
      'affiliate_commission_rate',
      'affiliate_minimum_payout',
      'affiliate_program_enabled',
      'marketplace_public'  -- Added this key
    )
  );
```

### Code Change (Optional Enhancement)
Additionally, update the access logic in `Marketplace.tsx` to allow users to view the "Coming Soon" page even when the marketplace is private. Currently, the logic redirects users away when they don't have "access", but they should be able to see the application form.

Update lines 226-230 in `src/pages/Marketplace.tsx`:
```tsx
// Change from redirecting when no access, to only redirecting when marketplace is public but user lacks access
useEffect(() => {
  if (!accessLoading && isMarketplacePublic && !hasAccess) {
    navigate('/', { replace: true });
  }
}, [accessLoading, hasAccess, isMarketplacePublic, navigate]);
```

And update lines 245-248:
```tsx
// Allow access to Coming Soon page even without hasAccess
if (!hasAccess && isMarketplacePublic) {
  return null;
}
```

## Expected Behavior After Fix
1. **When marketplace is private** (`marketplace_public = false`):
   - All users (logged in or not) can navigate to `/marketplace`
   - They see the "Coming Soon" page with the seller application form
   - Logged-in users with linked accounts can submit applications

2. **When marketplace is public** (`marketplace_public = true`):
   - Only whitelisted users, sellers, and admins can access the store directory
   - Others are redirected to homepage

## Technical Details

| Component | Change |
|-----------|--------|
| Database RLS Policy | Add `marketplace_public` to public read whitelist |
| `Marketplace.tsx` | Adjust redirect logic to allow private marketplace viewing |

## Files to Modify
- Database: `settings` table RLS policy (via migration)
- `src/pages/Marketplace.tsx` (lines 226-248)
