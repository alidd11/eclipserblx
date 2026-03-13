

## Revenue Hub — Root Cause + Layout Fix

### The Data Bug: `signOut()` Kills the Main Session

**Root cause**: After password verification succeeds, both `RevenueHub.tsx` (line 107) and `Income.tsx` (line 89) call:
```
verifyClient.auth.signOut()
```

Supabase's `signOut()` defaults to `scope: 'global'`, which **revokes ALL sessions for that user** — including the main app session. Once the revenue dashboard renders and tries to fetch data (FinancialOverview, StripeBalanceTab, etc.), the main client's token is now invalid. Every edge function call returns 401, every DB query fails with auth errors.

**Fix**: Change both files to use `scope: 'local'` so only the ephemeral verification client's session is revoked:
```typescript
verifyClient.auth.signOut({ scope: 'local' }).catch(() => {});
```

This is a one-line fix in two files.

### The Layout Issues

From the screenshots, the mobile layout has several problems:

1. **Nested tabs are confusing** — The page has an outer tab bar (Overview / Sources / Sellers) and an inner tab bar (Stripe / Gross / Credits / Robux / Sellers) with 5 icon-only tabs crammed together. The "Sellers" tab appears in both levels.

2. **FinancialOverview always renders above tabs** — When it errors, it shows a large red error card that pushes everything down. The 6-column KPI grid doesn't work on mobile (2 columns with 6 cards = 3 rows of dense cards before any actual content).

3. **Redundant content** — SellerEarningsTab is rendered both inside the "overview" nested tabs AND as the standalone "sellers" outer tab.

**Layout redesign plan**:

- **Flatten the tab structure** — Remove the outer Overview/Sources/Sellers tabs. Use a single tab bar with: Stripe, Gross, Credits, Robux, Sellers, Sources. On mobile, use the Select dropdown pattern (already established in the project).

- **Move FinancialOverview into the Stripe tab** or make it a collapsible summary section rather than always-visible.

- **Remove duplicate SellerEarningsTab** from the nested tabs since it has its own top-level tab.

- **Mobile tab bar**: Use Select dropdown on `sm:hidden` (already the pattern), show grid tabs on desktop.

### Files to Change

| File | Change |
|------|--------|
| `src/pages/admin/RevenueHub.tsx` | Fix `signOut` scope; flatten tab structure; use Select on mobile |
| `src/pages/admin/Income.tsx` | Fix `signOut` scope |

### Implementation Steps

1. Fix `signOut({ scope: 'local' })` in both RevenueHub and Income
2. Flatten RevenueHub to a single tab level: Stripe / Gross / Credits / Robux / Sellers / Sources
3. Move FinancialOverview inside the Stripe tab (or make it the default "Overview" first tab)
4. Apply mobile Select dropdown pattern for the tab navigation
5. Remove redundant SellerEarningsTab from nested sub-tabs

