
## Admin Dashboard Enterprise Cleanup

### What I Found

**Dead/Orphan files:**
1. `src/pages/admin/ContactMessages.tsx` (739 lines) — Not in routes, not in sidebar, zero references. Fully orphaned.
2. `src/components/admin/BulkActionBar.tsx` — Zero imports anywhere. Dead component.
3. `src/components/admin/ChatQuickActions.tsx` — Zero imports anywhere. Dead component.

**Remaining god-files (1,000+ lines):**
4. `src/pages/admin/Users.tsx` (1,056 lines) — User management table. Extract user table/filters into sub-components.
5. `src/pages/admin/Promotions.tsx` (1,034 lines) — Promotions manager. Extract promotion form and list.
6. `src/pages/admin/SellerStoreDetail.tsx` (1,023 lines) — Store detail view. Extract store info sections.

**Sidebar bloat:**
7. `src/components/admin/AdminSidebar.tsx` (595 lines) — Navigation config + render logic mixed together. Extract nav config data to `src/data/adminNavConfig.ts`.

---

### Phase 1: Delete Dead Files (Zero Risk)
- Delete `src/pages/admin/ContactMessages.tsx`
- Delete `src/components/admin/BulkActionBar.tsx`
- Delete `src/components/admin/ChatQuickActions.tsx`
- Type-check

### Phase 2: Split God-Files
- **Users.tsx** → Extract `UserTable.tsx` and `UserFilters.tsx` into `src/components/admin/users/`
- **Promotions.tsx** → Extract `PromotionForm.tsx` and `PromotionList.tsx` into `src/components/admin/promotions/`
- **SellerStoreDetail.tsx** → Extract store sections into `src/components/admin/store-detail/`
- Type-check after each

### Phase 3: Sidebar Extraction
- Extract nav config arrays to `src/data/adminNavConfig.ts` (~200 lines of pure data)
- `AdminSidebar.tsx` drops from 595 → ~400 lines (render-only)
- Type-check

### Impact
- 3 dead files deleted (~900 lines removed)
- 3 god-files split into focused components
- Sidebar data/logic separated
- Zero functional changes — purely structural
