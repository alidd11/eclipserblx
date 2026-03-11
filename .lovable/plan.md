

## Streamline Admin Finance Section

### Current State
The Finance sidebar has **11 separate pages**, many of which are closely related:
- Income, Income Sources (both analytics)
- Seller Payouts, Developer Payments, Manual Payouts (all payout management)
- Refunds, Disputes (both money-back flows)
- Platform Ledger (transaction log)
- Affiliates, Affiliate List, Referrals (affiliate program)

### Proposed Consolidation

```text
Finance (sidebar)
├── Revenue        ← merges Income + Income Sources
├── Payouts        ← merges Seller Payouts + Dev Payments + Manual Payouts
├── Ledger         ← Platform Ledger (stays)
├── Refunds & Disputes ← merges Refunds + Disputes
├── Affiliates     ← merges Affiliates + Affiliate List + Referrals
```

**11 items → 5 items**

### Changes

#### 1. Create `/admin/revenue` — Unified Revenue Hub
- **Always-visible header**: Summary stat cards (total revenue, monthly revenue, Stripe balance, active subscriptions)
- **Tabs**: Overview (current Income page content) | Sources (current Income Sources content) | Seller Earnings
- Keep the password re-verification gate from the current Income page
- Existing components (`FinancialOverview`, `StripeBalanceTab`, etc.) are reused as-is inside tab content

#### 2. Create `/admin/payouts` — Unified Payouts Hub
- **Always-visible header**: Stat cards (pending count, total pending amount, processed this month)
- **Tabs**: Seller Payouts | Developer Payments | Manual Payouts
- Each tab renders the existing table/action UI from its current page
- Extract core content from each page into components under `src/components/admin/payouts/`

#### 3. Create `/admin/disputes-refunds` — Combined Disputes & Refunds
- **Tabs**: Refunds | Disputes
- Each tab contains the existing page content
- Shared header with combined stats (open disputes + pending refunds)

#### 4. Create `/admin/affiliate-hub` — Combined Affiliates
- **Tabs**: Overview | Applications | Referrals
- Merges three current pages into one tabbed view

#### 5. Update Sidebar (`AdminSidebar.tsx`)
- Replace 11 items with 5 cleaner entries
- Use distinct icons for each

#### 6. Update Routing (`AppRoutes.tsx`)
- Add new hub routes
- Redirect old paths to new ones with appropriate tab query params for backward compatibility

#### 7. Platform Ledger — Stays Standalone
- No changes needed, it already serves a clear single purpose

### Design Notes
- All tabs use mobile-responsive `Select` dropdown pattern on small screens
- Password verification on Revenue hub carries over from current Income page
- No database changes required

