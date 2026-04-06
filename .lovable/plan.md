
# Enterprise Polish Sweep — Full Plan

## Phase 1: Quick Wins (Zero Risk)
**1a. Add `alt` text to 18 images missing it**
- Scan all `<img>` tags without `alt=`, add descriptive or empty-decorative alt text
- ✅ Check: `grep -rn "<img " src/ --include="*.tsx" | grep -v "alt=" | wc -l` → 0

**1b. Strip 35 stray `console.log` from frontend**
- Remove non-essential console.log statements (keep Auth/debug-prefixed ones)
- ✅ Check: Count drops significantly

**1c. Resolve 7 TODO/FIXME/HACK markers**
- Review each, either implement the fix or remove the comment if stale
- ✅ Check: `grep -rn "TODO\|FIXME\|HACK" src/ | wc -l` → 0

**🔒 Verification Gate 1:** `npx tsc --noEmit` passes, tests pass (90/90)

---

## Phase 2: Accessibility Hardening
**2a. Add `aria-label` to key interactive buttons (prioritise icon-only buttons)**
- Focus on the most impactful: icon-only buttons, close buttons, toggle buttons
- Target ~50 of the 110 flagged buttons (highest impact)
- ✅ Check: Count drops by 40%+

**🔒 Verification Gate 2:** `npx tsc --noEmit` passes, tests pass

---

## Phase 3: Database Hardening
**3a. Move extension out of public schema** (DB linter warning)
**3b. Audit security definer view** (DB linter error) — fix or document

**🔒 Verification Gate 3:** DB linter re-run shows 0 errors

---

## Phase 4: God-File Refactors (Top 5)
Split each into sub-components + hooks, one at a time with verification:

**4a. StaffProfile.tsx (893 lines)** → Extract tab panels into separate components
**4b. Affiliate.tsx (890 lines)** → Extract dashboard sections
**4c. LiveChat.tsx (878 lines)** → Extract message list, input, sidebar
**4d. ProductDetail.tsx (873 lines)** → Extract info panel, reviews, gallery
**4e. Disputes.tsx (854 lines)** → Extract table, filters, detail dialog

**🔒 Verification Gate 4 (after each file):** `npx tsc --noEmit` + tests pass

---

## Phase 5: Final Verification
- Full TypeScript check
- Full test suite
- DB linter clean
- Security scan clean
- Final `any` count audit
