

## Enterprise Cleanup — Centralized Date Utils + God-File Splitting

Two phases, each verified with a full type-check before moving on.

---

### Phase 1: Centralized Date Utilities (Low Risk)

**Create `src/lib/dateUtils.ts`** — a thin wrapper re-exporting the 24 date-fns functions actually used, plus two project-standard formatters:

```text
formatDate(date)        → "Jan 5, 2025"
formatDateTime(date)    → "Jan 5, 2025 2:30 PM"
formatRelative(date)    → "3 hours ago"
```

**Step 1a** — Create `src/lib/dateUtils.ts` with re-exports and helpers.

**Step 1b** — Migrate the top-20 most-imported files (those using `format` or `formatDistanceToNow`) to import from `@/lib/dateUtils` instead of `date-fns` directly. Run type-check.

**Step 1c** — Migrate remaining ~108 files in batches of ~25. Type-check after each batch.

This is purely mechanical — no logic changes, just import paths.

---

### Phase 2: God-File Splitting (Moderate Risk — safest files first)

Split 6 files that exceed 1,000 lines, starting with the simplest (static content) and ending with the most complex (realtime state).

**Step 2a — `PortalBotSetup.tsx` (2,267 lines)**
This file is 90% static string constants (embedded bot source code). Extract `BOT_FILES` object into `src/data/portalBotFiles.ts`. The page file drops to ~300 lines. Type-check.

**Step 2b — `Advertise.tsx` (1,095 lines)**
Extract the ad tier pricing cards, the ad history table, and the slot picker form into sub-components under `src/components/ads/`. Type-check.

**Step 2c — `BecomeSellerWizard.tsx` (1,008 lines)**
Extract each wizard step (Store Info, Verification, Agreement, Confirmation) into separate components under `src/components/seller/wizard/`. Type-check.

**Step 2d — `Analytics.tsx` (1,474 lines)**
Extract each analytics card/section (traffic, revenue, top products, geo breakdown) into components under `src/components/admin/analytics/`. Type-check.

**Step 2e — `Products.tsx` (1,579 lines)**
Extract the product table, filters bar, bulk actions toolbar, and product row into components under `src/components/admin/products/`. Type-check.

**Step 2f — `LiveChat.tsx` (1,093 lines)**
Most complex — has realtime subscriptions and shared state. Extract the conversation list sidebar, message thread, and typing indicator into components under `src/components/admin/live-chat/`. Type-check.

---

### Verification Strategy

After every step: `npx tsc --noEmit` (full type-check). If errors appear, fix before proceeding. No step depends on a later step, so any can be paused safely.

### Files Changed

**Phase 1:**
- **Create**: `src/lib/dateUtils.ts`
- **Edit**: ~128 files (import path changes only)

**Phase 2:**
- **Create**: `src/data/portalBotFiles.ts`, ~15 new sub-component files across `src/components/ads/`, `src/components/seller/wizard/`, `src/components/admin/analytics/`, `src/components/admin/products/`, `src/components/admin/live-chat/`
- **Edit**: 6 god-files (dramatically reduced in size)

