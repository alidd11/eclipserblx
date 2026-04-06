

## Enterprise Polish Pass — Seller Dashboard Pages

### What We Found

Audited all 48 seller pages. Most follow the enterprise flat pattern well (Products, Orders, Finance, Analytics, Settings, Reviews, Discounts). However, **11 pages** still have legacy patterns that break visual consistency:

### Issues to Fix

**1. Legacy `Card`/`CardContent` wrappers (11 pages)**
These pages still import and use Shadcn `Card` components instead of the standardized `border-border rounded-xl` flat containers:
- `SellerCampaigns.tsx` — imports Card but doesn't actually render them (dead import)
- `SellerNotifications.tsx` — uses `CardContent` for notification rows without a parent Card (broken semantics)
- `SellerBundles.tsx` — imports Card (needs audit of actual usage)
- `SellerRefunds.tsx` — imports Card (needs audit)
- `SellerCustomerInsights.tsx` — uses `Card`/`CardHeader`/`CardTitle` wrappers
- `SellerCustomSections.tsx` — uses Card wrappers
- `SellerProductEditor.tsx` — uses Card wrappers
- `SellerDiscord.tsx` — imports Card
- `SellerTermsOfService.tsx` — imports Card
- `SellerBundles.tsx` — imports Card
- `AcceptTeamInvite.tsx` — uses Card (standalone page, acceptable)

**2. Decorative icons in page headings (3 pages)**
Enterprise standard: no icons in `h1` titles. These pages violate that:
- `SellerCampaigns.tsx` — `<Megaphone>` icon in h1
- Possibly others using icon + h1 pattern

**3. `gradient-button` class (3 pages)**
Legacy gaming aesthetic — should be replaced with standard `<Button>` primary variant:
- `SellerCampaigns.tsx` — 2 instances
- `SellerGoals.tsx` — 2 instances  
- `SellerWebhooks.tsx` — 1 instance

**4. Notification rows using `CardContent` without parent Card**
`SellerNotifications.tsx` wraps each notification in `<CardContent>` inside a plain `<div>`, which applies card padding without the card border — inconsistent spacing.

### Implementation

**Step 1: Fix SellerCampaigns.tsx**
- Remove `Card` import (dead)
- Remove `<Megaphone>` icon from h1
- Replace `gradient-button border-0` with standard Button (no class override)

**Step 2: Fix SellerNotifications.tsx**
- Remove `Card`/`CardContent` import
- Replace `<CardContent>` wrapper with a plain `<div>` using `flex items-start gap-3 py-3 px-4`
- Wrap notification list in `border border-border rounded-xl overflow-hidden divide-y divide-border`

**Step 3: Fix SellerCustomerInsights.tsx**
- Replace `Card`/`CardHeader`/`CardTitle` with flat `border-border rounded-xl` sections with `bg-muted/30` headers

**Step 4: Fix SellerGoals.tsx**
- Replace `gradient-button border-0` with standard Button

**Step 5: Fix SellerWebhooks.tsx**
- Replace `gradient-button border-0` with standard Button

**Step 6: Fix remaining Card imports**
- `SellerBundles.tsx`, `SellerRefunds.tsx`, `SellerDiscord.tsx`, `SellerTermsOfService.tsx`, `SellerCustomSections.tsx`, `SellerProductEditor.tsx` — replace Card wrappers with flat enterprise containers

### Files Changed
- `src/pages/seller/SellerCampaigns.tsx`
- `src/pages/seller/SellerNotifications.tsx`
- `src/pages/seller/SellerCustomerInsights.tsx`
- `src/pages/seller/SellerGoals.tsx`
- `src/pages/seller/SellerWebhooks.tsx`
- `src/pages/seller/SellerBundles.tsx`
- `src/pages/seller/SellerRefunds.tsx`
- `src/pages/seller/SellerDiscord.tsx`
- `src/pages/seller/SellerTermsOfService.tsx`
- `src/pages/seller/SellerCustomSections.tsx`
- `src/pages/seller/SellerProductEditor.tsx`

### Risk
Low — purely visual. No logic, data, or API changes. All edits are CSS class and component wrapper swaps following the established pattern already used by Products, Orders, Finance, Analytics, and Settings pages.

