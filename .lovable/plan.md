
## Enterprise Gap Closure — Complete Plan

### Phase 1: Card → Flat Container Migration (104 files)
**Impact: Highest — visual consistency across entire app**

Mechanical find-and-replace: remove `Card/CardHeader/CardTitle/CardContent/CardFooter` imports, replace with `div` elements using `border border-border rounded-xl` pattern with `bg-muted/30` headers.

**Batch 1A — Admin pages (73 files):**
All files listed under `src/pages/admin/` and `src/components/admin/` that import from `@/components/ui/card`.

**Batch 1B — Customer & Seller pages (31 files):**
All files under `src/pages/`, `src/components/seller/`, `src/components/account/`, `src/components/product/`, etc.

Each file gets the same transformation:
- `<Card>` → `<div className="border border-border rounded-xl overflow-hidden">`
- `<CardHeader>` → `<div className="px-4 py-3 border-b border-border bg-muted/30">`
- `<CardTitle>` → `<h3 className="font-semibold text-sm">`
- `<CardContent>` → `<div className="p-4">`
- `<CardFooter>` → `<div className="flex items-center p-4 pt-0">`
- Remove Card imports

**Verification:** `npx tsc --noEmit` after each batch. Visual spot-check on 5 key pages.

---

### Phase 2: Hardcoded Color Cleanup (497 instances, ~50 files)
**Impact: High — theming/dark mode resilience**

**Priority targets (bot pages account for 350+ of 497):**
- `src/pages/bot/` — 13 files with 300+ hardcoded colors
- `src/components/bot-dashboard/` — 3 files
- Remaining scattered files (~20)

Replacements:
- `text-white` → `text-foreground` or `text-primary-foreground` (context-dependent)
- `bg-white` → `bg-background` or `bg-card`
- `bg-black` → `bg-background` or `bg-foreground`
- `text-black` → `text-foreground`

**Verification:** `npx tsc --noEmit`, visual check on bot dashboard pages.

---

### Phase 3: Monolith Splitting (5 files over 1,000 lines)
**Impact: Medium-High — maintainability**

| File | Lines | Split Strategy |
|------|-------|----------------|
| `SellerProducts.tsx` (1,260) | Extract filters, bulk actions, product grid into sub-components |
| `Promotions.tsx` (1,034) | Extract promotion list, editor, analytics into widgets |
| `SellerStoreDetail.tsx` (1,023) | Extract store info, products, analytics sections |
| `SellerProductEditor.tsx` (1,012) | Extract form sections (pricing, media, details) |
| `ChatSidePanel.tsx` (973) | Extract message list, input area, header |

Target: Each file under 400 lines post-split.

**Verification:** `npx tsc --noEmit`, run existing tests.

---

### Phase 4: Type Safety Audit (top 25 files, ~250 `any` types)
**Impact: Medium — bug prevention**

Focus on the 25 worst offenders:
- `SellerAnalytics.tsx` (21 any), `Disputes.tsx` (20), `UserDialogs.tsx` (17)
- `SellerProducts.tsx` (14), `SellerPayouts.tsx` (13), `Promotions.tsx` (11)
- Replace `any` with proper types from `@/integrations/supabase/types.ts` or create interfaces

**Verification:** `npx tsc --noEmit` — should remain at zero errors.

---

### Phase 5: Test Coverage (target: 30+ new test files)
**Impact: Medium — regression safety**

**Priority test targets:**
1. Auth flow (login, signup, session management)
2. Cart & checkout logic
3. Permission gates (useAdminAuth, useUserPermissions)
4. Seller product CRUD operations
5. Order management flows
6. Key UI components (product cards, navigation)

**Verification:** All tests pass via `vitest run`.

---

### Phase 6: Final Verification & Cleanup
- Full `npx tsc --noEmit` pass
- Run all tests
- Remove any orphaned imports/components
- Grep for remaining `console.log` statements
- Visual spot-check on 10 key pages (dashboard, product detail, seller dashboard, checkout, admin orders, disputes, bot dashboard, store page, account, affiliate)

---

### Execution Order & Risk
Phases 1-2 are mechanical (low risk, high impact). Phase 3 is structural (medium risk). Phase 4 is safe (no behavior change). Phase 5 is additive (zero risk).

Each phase is independently deployable and verifiable.

### What stays unchanged
- Database schema and migrations
- Edge function code
- Routing structure
- Business logic
- `portalBotFiles.ts` (2,004 lines — static data, cosmetic concern only)
