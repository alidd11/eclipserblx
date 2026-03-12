

# Revenue Page Crash: Root Cause and Fix

## Root Cause

The crash loop is caused by **two systems fighting each other**:

1. **Password verification** stores `isVerified` in React state (memory only)
2. **App version check** (`useAppVersionCheck`) detects `force_update: true` in the database (version `1.0.81`) and triggers `window.location.reload()` after a 2-second delay
3. After reload, React state is wiped -- `isVerified` resets to `false` -- so the password form shows again
4. The user re-enters password, the version check fires again, and the cycle repeats
5. After 2 reload attempts, the version check stops, but Safari's "A problem repeatedly occurred" error has already triggered

**Evidence**: The browser URL after navigation shows `?__v=1.0.81&__t=...&__ra=1`, confirming the version check already triggered a forced reload. The `force_update` flag is still `true` in the `app_version` table from March 4th.

## Fix

### 1. Persist verification state in sessionStorage (RevenueHub.tsx)

When password verification succeeds, store the timestamp in `sessionStorage`. On mount, check if a valid (non-expired) verification exists and skip the password gate. This survives page reloads within the same tab while still respecting the 10-minute timeout.

```
// On verify success:
sessionStorage.setItem('revenue_verified_at', Date.now().toString())

// On mount:
const stored = sessionStorage.getItem('revenue_verified_at')
if (stored && Date.now() - parseInt(stored) < SESSION_TIMEOUT_MS) {
  setIsVerified(true)
}
```

### 2. Apply the same fix to Income.tsx

The legacy `AdminIncome` page at `/admin/income` has the same vulnerability -- its `isVerified` state is also memory-only.

### 3. Clear stale force_update flag

Set `force_update` to `false` in the `app_version` table since version `1.0.81` has been deployed for 8 days and all clients should have it by now. This prevents unnecessary reload triggers.

---

**Files changed**: `src/pages/admin/RevenueHub.tsx`, `src/pages/admin/Income.tsx`
**Database**: Update `app_version` to set `force_update = false`

