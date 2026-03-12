

# Fix Team Invites + Multi-Store Access

## Problem 1: Team Invites Showing "Expired"

Two root causes:

1. **Broken redirect URL**: When unauthenticated users click the email link, the "Sign In" button links to `/auth?redirect=/seller/team/accept?token=XXX`. The `?token=` part is ambiguous — it gets parsed as a second query parameter on `/auth` instead of being part of the redirect path. After login, the redirect loses the token.

2. **RLS blocks token lookup**: The SELECT policy on `store_team_invites` restricts rows to `email = get_user_email(auth.uid())`. If the query returns null (RLS filtering), the code treats it as "expired" instead of distinguishing "not found" from "not your invite". This is actually correct behavior, but the error message is misleading.

3. **Silent RLS failures**: When `maybeSingle()` returns null due to RLS (not actual expiry), the user sees "expired" with no useful guidance.

### Fix
- **Encode the redirect URL properly** using `encodeURIComponent` so the full path including `?token=` is preserved as one value.
- **Use an edge function** (or a security-definer DB function) to validate invites by token without RLS restrictions, returning status info (valid/expired/wrong-email/not-found) so the UI can show the correct message.
- Improve error states to distinguish between "expired", "wrong email", and "not found".

## Problem 2: Multi-Store Access (Team Member Stores)

Currently `useSellerStatus` only fetches stores the user **owns**. Users who are team members of other stores have no way to see or switch to those stores.

### Fix
- Create a `useStoreAccess` hook that fetches both owned stores and stores where the user is an accepted team member.
- Add a store switcher dropdown in the seller sidebar header when the user has access to multiple stores.
- Store the active store selection in localStorage so it persists across sessions.
- Update `useSellerStatus` to accept an optional `storeId` override from the switcher context.

## Implementation Steps

### Database
1. Create a `validate_team_invite` security-definer function that takes a token and user_id, bypasses RLS, and returns invite status with details (valid/expired/wrong_email/not_found/already_member).

### Frontend - Invite Fix
2. Update `AcceptTeamInvite.tsx`:
   - Fix the redirect URL encoding in the "Sign In" link.
   - Call the new `validate_team_invite` DB function instead of direct table query.
   - Show distinct UI states for "wrong email" vs "expired" vs "not found".
   - After accepting, use the DB function to insert (already has an RLS policy for this).

### Frontend - Multi-Store
3. Create `src/hooks/useStoreAccess.ts` — fetches owned stores + team member stores, manages active store selection.
4. Create `src/components/seller/StoreSwitcher.tsx` — dropdown component showing all accessible stores with role badges.
5. Integrate `StoreSwitcher` into `SellerSidebar.tsx` header area.
6. Create a `StoreContext` provider so all seller pages can access the currently active store.
7. Update `useSellerStatus` to respect the active store from context (backward-compatible — defaults to first owned store if no selection).

### Files to Create
- `src/hooks/useStoreAccess.ts`
- `src/components/seller/StoreSwitcher.tsx`
- `src/contexts/ActiveStoreContext.tsx`

### Files to Edit
- `src/pages/seller/AcceptTeamInvite.tsx` (redirect URL fix + validation logic)
- `src/components/seller/SellerSidebar.tsx` (add StoreSwitcher)
- `src/components/seller/SellerLayout.tsx` (wrap with ActiveStoreProvider)
- `src/hooks/useSellerStatus.ts` (accept optional storeId override)

### Migration
- One migration: `validate_team_invite(p_token text, p_user_id uuid)` security-definer function.

