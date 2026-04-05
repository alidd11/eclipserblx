

## Old-Style Card Audit — Should They Be Flattened?

### What I Found

There are **~40+ files** across the customer-facing codebase still using Shadcn `Card`/`CardHeader`/`CardTitle` wrappers instead of the flattened `div` + `border-border rounded-xl` pattern established in the v4 enterprise overhaul. An enterprise company would absolutely standardize this — inconsistent component patterns create visual noise and maintenance debt.

### Where the Old Cards Still Exist

**Account section (13 files)** — the biggest offender:
- `ReferralCard.tsx`, `BecomeSellerCard.tsx`, `MyMessagesCard.tsx`, `NotificationSettingsCard.tsx`, `SoundCustomizationCard.tsx`, `CreditsCard.tsx`
- `MyAdvertisementsPage.tsx`, `AdAnalyticsPage.tsx`, `FollowingPage.tsx`

**Wallet section (4 files)**:
- `WalletBalanceCard.tsx`, `TransactionHistoryCard.tsx`, `MyPaymentsCard.tsx`, `AddCreditsCard.tsx`

**Marketplace sidebar cards (5 files)**:
- `TopSellersCard.tsx`, `CategoriesGridCard.tsx`, `NewArrivalsCard.tsx`, `BecomeSellerCard.tsx`, `HowItWorksCard.tsx` — these also use gradient icon backgrounds (`bg-gradient-to-br from-amber-500/20`) which contradicts the flat aesthetic

**Support page (1 file)**:
- `Support.tsx` quick-link cards still use `Card`/`CardContent`

**Bot/GlobalGuard pages (3 files)**:
- `BotDashboard.tsx`, `BotLogs.tsx`, `Servers.tsx`

**Seller banners (2 files)**:
- `PendingReviewBanner.tsx`, `TosBanner.tsx`

**Product detail (1 file)**:
- `ProductDetail.tsx` — review/info sections

### Would an Enterprise Company Do This?

No. An enterprise company enforces a single container pattern across the entire product. The current mix of `<Card>` wrappers (with their built-in padding, shadows, and rounded corners) alongside raw `div` containers with `border-border rounded-xl` creates two competing visual languages. Enterprise platforms like Shopify Admin, Stripe Dashboard, and Linear all use one consistent container style throughout.

### The Plan

Systematically replace all customer-facing `Card`/`CardHeader`/`CardTitle` usage with the established flattened pattern:
- `<Card>` → `<div className="border border-border rounded-xl overflow-hidden">`
- `<CardHeader>` → `<div className="px-6 py-4 bg-muted/30 border-b border-border">`
- `<CardTitle>` → `<h3 className="text-sm font-semibold">` (or appropriate size)
- `<CardContent>` → `<div className="p-6">`
- Remove gradient icon backgrounds → use flat `bg-primary/10` or `bg-muted`

### Execution Order (by impact)

1. **Account cards** (13 files) — most user-facing, highest traffic
2. **Wallet cards** (4 files) — payment-critical, needs polish
3. **Marketplace sidebar cards** (5 files) — visible on every browse page
4. **Support quick-link cards** (1 file)
5. **Bot/GlobalGuard pages** (3 files)
6. **Seller banners** (2 files)
7. **ProductDetail sections** (1 file)

### Files Changed
~29 files total across `src/components/account/`, `src/components/wallet/`, `src/components/marketplace/`, `src/pages/Account/`, `src/pages/Support.tsx`, `src/pages/BotDashboard.tsx`, `src/pages/global-guard/`, `src/components/seller/banners/`, and `src/pages/ProductDetail.tsx`

### What This Achieves
- One consistent container language across the entire customer experience
- Removes the visual weight of Card shadows/borders in favor of the established flat aesthetic
- Eliminates gradient icon backgrounds that conflict with the enterprise direction
- Reduces dependency on the Shadcn Card component for layout (it remains available for truly interactive/clickable card patterns like ProductCard)

