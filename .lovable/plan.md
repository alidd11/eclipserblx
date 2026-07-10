
# Admin dashboard uplift

Scope: whole admin area (sidebar, headers, dashboard overview, sub-pages). Four tracks, delivered in this order so each builds on the previous.

## 1. Navigation & information architecture

Current sidebar is a long single list; hard to scan. Rework into clear, collapsible groups matching how the work actually flows:

```text
Overview        Dashboard · Analytics · Observability
Commerce        Orders · Products · Categories · Promotions · Disputes
Finance         Revenue · Payouts · Ledger · Commissions · Referrals · Affiliates
Support         Live Chat · Customer Tickets · Seller Tickets · Messages · Canned Responses
Sellers         Stores · Product Review · Agreements · Documents
People          Customers · Staff · Roles & Permissions · Duty Logs
Trust & Safety  Moderation · IP Reports · IP Bans · Compliance · GDPR · Audit Logs
System          Settings · Email Templates · Changelog · Roadmap · Incidents · SEO · Orion
```

- Persistent group state (remembered per user via localStorage).
- Active branch auto-expands, others stay collapsed by default → less visual noise.
- Global `⌘K` command bar already exists (`AdminCommandSearch`) — surface it in the header with a visible hint pill.

## 2. Dashboard overview redesign

Today's `/admin` stacks: HeroBanner → 4 KPIs → SystemAlerts → DutyClock → 12-tile grid → AssignedTickets. It's a flat list.

Move to a two-column workbench:

```text
┌──────────────────────────────┬────────────────────┐
│ Greeting + timezones + ⌘K    │ Duty clock         │
├──────────────────────────────┴────────────────────┤
│ 6 KPI tiles with sparkline + Δ vs yesterday       │
├──────────────────────────────┬────────────────────┤
│ Today's queue                │ System alerts      │
│ · Assigned tickets           │ · Incidents        │
│ · Pending refunds            │ · Failed webhooks  │
│ · Products awaiting review   │ · Backend health   │
├──────────────────────────────┼────────────────────┤
│ Revenue last 14d (mini area) │ Activity feed      │
├──────────────────────────────┴────────────────────┤
│ Quick actions (permission-filtered, max 8)        │
└───────────────────────────────────────────────────┘
```

KPI additions: Revenue today (with Δ), Refund rate 7d, Avg first-response time, plus existing Active orders / Open tickets / Staff on duty. Each tile gets a 20-point sparkline.

## 3. Visual polish

- Standardise every admin page header via `AdminPageHeader` (title, subtitle, right-slot actions, optional breadcrumb-free back). Purge one-off `<h1>` blocks.
- Section shell: replace ad-hoc borders with a single `<AdminSection title actions>` component (bg-muted/30 header, rounded-xl, border-border). Reused across every sub-page.
- Table shell: uniform `<AdminTable>` — sticky header, zebra-off, 44px rows, right-aligned numerics, monospace for IDs/amounts.
- Empty & loading states: `AdminEmptyState` already exists — extend with a matching `AdminTableSkeleton` sized to the real table so layout doesn't jump.
- Density toggle in header: Comfortable / Compact (persists per user). Compact drops row height to 36px and paddings by 25%.

## 4. Performance & load

- Consolidate dashboard queries into one `use-admin-overview` hook that batches KPI + alerts + queue counts into a single Supabase RPC → 1 round-trip instead of 8.
- Prefetch top nav destinations on sidebar hover (`usePrefetchRoute` already exists).
- Add `<Suspense>` + real-shaped skeletons per widget so the overview paints in stages instead of blocking on the slowest query.
- Cache KPIs with `staleTime: 60s`, `refetchOnWindowFocus: false`; move heavy widgets (Activity feed, Revenue chart) behind `LazySection`.
- Move the 12-icon Quick Actions grid to permission-filtered top 8 to cut render + re-render cost.

## Technical notes

- New/edited files: `AdminSidebar.tsx` (grouping), `AdminLayout.tsx` (density + ⌘K pill), new `AdminSection.tsx` / `AdminTable.tsx` / `AdminTableSkeleton.tsx`, `pages/admin/Dashboard.tsx` (two-column layout), new `dashboard/RevenueSpark.tsx`, `dashboard/TodayQueue.tsx`, extended `DashboardKPIs.tsx` with sparklines + deltas.
- New Postgres function `admin_overview_snapshot()` (SECURITY DEFINER, callable by staff via `has_role`) returning JSON with all counts + 14-day revenue series. One migration.
- No changes to routes, permissions model, or business logic. Pure UX/perf pass.

## Rollout

Ship in 4 PR-sized steps (nav → overview → shell components → perf/RPC). Each stage is independently reviewable and doesn't block the others visually.
