
# Add Seller Earnings Tab to Admin Income Dashboard

## What This Adds
A new **"Seller Earnings"** tab in the existing Income Analytics page (`/admin/income`) that gives you full business visibility into how money flows through the marketplace -- what sellers earn, what the platform keeps as commission, and the status of payouts.

## Why This Matters
Right now, the Income page shows Stripe balance, credits, gross revenue, and Robux -- but nothing about seller-side finances. As a marketplace operator, you need to see:
- How much commission the platform is earning
- How much sellers are owed vs. what's been paid out
- Which stores are generating the most revenue
- Payout pipeline status (pending, processing, completed)

## What You'll See

### Summary Cards
- **Total Platform Commission** -- your cut from all seller sales
- **Total Seller Earnings** -- net amount earned by all sellers
- **Outstanding Balances** -- total owed to sellers (not yet paid)
- **Total Paid Out** -- how much has been paid to sellers
- **Stripe Fees on Seller Sales** -- fees deducted from seller transactions

### Breakdowns
- **Time-period breakdown** (today / 7 days / 30 days / all time) for commission and seller earnings
- **Top Stores by Revenue** -- ranked list showing each store's gross sales, commission paid, and net earnings
- **Payout Pipeline** -- counts and totals for pending, processing, awaiting funds, and completed payouts

### 30-Day Trend Chart
- Lines for platform commission and seller earnings over the last 30 days

---

## Technical Details

### File Modified
- **`src/pages/admin/Income.tsx`** -- Add a 5th tab "Sellers" to the existing Tabs component

### Data Sources (all existing tables, no schema changes needed)
- `seller_transactions` (type='sale', refunded_at IS NULL) -- gross, platform_fee, stripe_fee, net_amount per sale
- `seller_balances` -- available_balance, total_earned, total_paid per seller/store
- `seller_payouts` -- payout status pipeline (pending/processing/completed/rejected)
- `stores` -- store names for the top-stores leaderboard

### New Queries (all within the existing Income page component)
1. **Seller financial summary** -- aggregates from `seller_transactions`
2. **Balance overview** -- aggregates from `seller_balances`
3. **Top stores** -- grouped by store_id from `seller_transactions` joined with `stores`
4. **Payout pipeline** -- grouped counts/sums from `seller_payouts`
5. **30-day trend** -- daily aggregation from `seller_transactions`

### No database changes required -- all data already exists.
