
## Enterprise Gap Closure Plan

### Phase 1: Admin Dashboard Refactor (Priority: High)
**Problem:** `Dashboard.tsx` is a 474-line monolith using Shadcn `Card` components instead of the platform's `border-border rounded-xl` convention.
- Extract stat cards, quick actions, system alerts, and clock-in/out into isolated widget components
- Replace all `Card/CardHeader/CardTitle/CardContent` with flat `border-border rounded-xl` containers
- Move to a folder structure: `src/components/admin/dashboard/`

### Phase 2: UI Consistency Audit (Priority: High)
**Problem:** 75 admin files still import Shadcn Card components; auth buttons have inconsistent heights (h-11 vs h-12).
- Standardize social login button heights to `h-12` (enterprise standard)
- Audit and convert high-visibility admin pages (Dashboard, StaffProfile, Disputes) from Card to flat containers
- Won't convert all 75 files at once — focus on the 10 most-visited admin pages

### Phase 3: Monolithic Page Splitting (Priority: Medium)
**Problem:** 15+ pages exceed 400 lines, with 5 exceeding 1,000 lines.
- Split `SellerProducts.tsx` (1,260 lines) into list/grid, filters, and bulk-action sub-components
- Split `ProductDetail.tsx` (1,062 lines) into sections (hero, details, reviews, recently-viewed)
- Split `Promotions.tsx` (1,034 lines) into promotion list, editor, and analytics widgets
- Remaining large files deferred to a follow-up pass

### Phase 4: Test Coverage (Priority: Medium)
**Problem:** Only 8 unit tests exist, all utility-focused. Zero component tests.
- Add component tests for critical user flows: auth (login/signup), cart, checkout
- Add tests for key admin components: stat cards, permission gates
- Target: 15+ new test files covering core business logic

### Phase 5: Verification
- Run `npx tsc --noEmit` after each phase
- Run all tests after Phase 4
- Visual spot-check on key pages (dashboard, product detail, seller dashboard)

### What stays unchanged
- Database schema and RLS policies (separate concern)
- Edge function code (already cleaned in previous pass)
- Overall routing and navigation structure

### Risk
Low-Medium — refactoring existing code with no logic changes. Each phase is independently deployable.
