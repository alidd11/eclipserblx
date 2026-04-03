

# Seller Promotions Revamp — Roblox Ads Manager Style

Redesign the seller promotion system (`/seller/promote`) to mirror the Roblox Ads Manager mental model, making it immediately familiar to Roblox creators.

## What Changes

### 1. Rename & Restructure: "Promotions" → "Ad Manager"
- Rename the page title from "Promotions" to "Ad Manager"
- Rename "New Promotion" to "Create Campaign"
- Update sidebar label from "Promote" to "Ad Manager"

### 2. Campaign Creation Wizard (replaces dialog)
Replace the small `CreatePromotionDialog` with a full-page stepped form matching Roblox's flow:

**Step 1 — Product**: Select which product to promote + campaign name field
**Step 2 — Goal**: Choose objective (Clicks / Impressions / Sales)
**Step 3 — Audience**: Target by device type (Desktop/Mobile/All) and optionally by category/country
**Step 4 — Budget & Schedule**: Daily or weekly budget, start date, duration picker, payment method (Eclipse Credits balance shown)
**Step 5 — Creative**: Select which product image(s) to use as the ad thumbnail (up to 3)
**Step 6 — Review & Publish**: Summary card with all selections, confirm button

This replaces the current single-dialog approach with a guided multi-step experience.

### 3. Campaign Dashboard with Reporting Table
Replace the current tab-based card list with a Roblox-style reporting view:

- **Metric cards row**: Amount Spent, Impressions, Clicks, CTR (matches Roblox's layout)
- **Campaign table**: Columns for Campaign Name, Status (with toggle), Spent, Impressions, Clicks, CPP (cost-per-click), CTR
- **Status badges**: In Review, Active, Scheduled, Completed, Paused, Cancelled (expanded from current 4 statuses)
- **Date range filter**: 7d / 30d / All time selector
- Clicking a campaign row expands inline details (demographics, performance chart)

### 4. Per-Campaign Demographics & Analytics
When a seller clicks into a campaign, show:

- **Device breakdown**: Desktop vs Mobile vs Tablet (donut chart, reusing `RevolutDonutChart`)
- **Country breakdown**: Top countries by click origin (donut chart)
- **Click trend**: Daily clicks over the campaign duration (line chart, reusing `RevolutLineChart`)
- **Estimated revenue impact**: If the product had sales during the campaign period, show correlation

Data sources: `product_promotions` table for impressions/clicks, `page_visits` for country/device data filtered by product slug during campaign dates.

### 5. Database Changes
Add columns to `product_promotions`:
- `campaign_name` (text, nullable) — user-friendly name
- `goal` (text, default 'clicks') — clicks/impressions/sales
- `target_devices` (text[], nullable) — device targeting
- `target_countries` (text[], nullable) — country targeting
- `daily_budget` (numeric, nullable) — alternative to weekly bid
- `budget_type` (text, default 'weekly') — daily/weekly
- `duration_days` (integer, default 7) — campaign duration
- `creative_images` (text[], nullable) — selected thumbnail URLs
- `total_spent` (numeric, default 0) — running spend tracker

### 6. Billing Section
Add a simple "Billing" tab showing:
- Credit transaction history for ad spend
- Total spent this month / all time
- Link to top-up credits

## Files Modified
- `src/pages/seller/SellerPromotions.tsx` — full rewrite as "Ad Manager" with reporting table
- `src/components/seller/CreatePromotionDialog.tsx` → rename to `CreateCampaignWizard.tsx` — multi-step form
- `src/components/seller/PromotionCard.tsx` → `CampaignRow.tsx` — table row with expandable details
- `src/components/seller/SellerSidebar.tsx` — rename "Promote" to "Ad Manager"
- `src/pages/seller/SellerDashboard.tsx` — update quick-link label
- New: `src/components/seller/CampaignAnalytics.tsx` — per-campaign demographics panel
- Database migration: add new columns to `product_promotions`

## Files NOT Modified
- `src/pages/Account/MyAdvertisementsPage.tsx` — this is for Discord ads (separate system)
- `src/pages/Account/AdAnalyticsPage.tsx` — Discord ad analytics (separate)
- Admin advertisement analytics — separate system

