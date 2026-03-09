

# Full Platform Audit Report

## Scope
Audited all 200+ routes, 150+ edge functions, sidebar navigations, footer links, and component architecture across the entire marketplace platform.

---

## 1. ORPHANED PAGES (Exist but No Route or No Navigation)

### Critical — No Route Defined

| Page File | Issue | Severity |
|-----------|-------|----------|
| `src/pages/admin/ContactMessages.tsx` | Page exists but has **no route** in `AppRoutes.tsx` and **no sidebar entry** — completely inaccessible | Medium |
| `src/pages/Marketplace.tsx` | Full 501-line page component exists but is **not imported or routed** — `/marketplace` route actually renders `Products` component instead | Low (redundant) |
| `src/pages/Landing.tsx` | Page file exists but is **never imported or routed** | Low |

### Critical — Route Exists but Missing from Sidebar Navigation

These admin routes exist in `AppRoutes.tsx` but are **completely absent from `AdminSidebar.tsx`**, meaning staff can only reach them by typing the URL directly:

| Route | Page | Severity |
|-------|------|----------|
| `/admin/recruiters` | AdminRecruiters | High |
| `/admin/recruiter-applications` | AdminRecruiterApplications | High |
| `/admin/recruiter-payouts` | AdminRecruiterPayouts | High |
| `/admin/recruiter-commissions` | AdminRecruiterCommissions | High |
| `/admin/bot-codes` | AdminBotCodes | High |
| `/admin/referrals` | AdminReferrals | High |
| `/admin/email-templates` | AdminEmailTemplates | Medium |
| `/admin/ip-shield-custom-plans` | AdminIPShieldCustomPlans | Medium |
| `/admin/gdpr-compliance` | AdminGDPRCompliance | High |

### Seller Sidebar — Missing Routes

These seller routes exist but have **no sidebar entry**:

| Route | Issue | Severity |
|-------|-------|----------|
| `/seller/promote` | SellerPromotions page — no sidebar link anywhere | Medium |
| `/seller/tax-summary` | SellerTaxSummary — no sidebar link | Medium |
| `/seller/settings/notifications` | SellerSettingsNotifications — no sidebar link (only linked from SellerDiscord page) | Medium |
| `/seller/documents/*` (6 sub-routes) | Document sub-pages (terms, guide, product-listing, etc.) — accessible only from the Documents page, not from sidebar | Low (acceptable) |

---

## 2. ROUTE INCONSISTENCIES

| Issue | Details | Severity |
|-------|---------|----------|
| Store About path mismatch | Route uses `:slug` param (`/store/:slug/about`) but Store and Reviews pages use `:storeSlug` — potential parameter name confusion | Medium |
| `/downloads` and `/orders` both redirect to `MyPurchases` | Not a bug but may confuse SEO — three URLs for same page | Low |
| `/marketplace` renders `Products` (same as `/products`) | Duplicate route, `Marketplace.tsx` page is orphaned | Low |

---

## 3. NAVIGATION & LINK INTEGRITY

| Area | Status | Issues |
|------|--------|--------|
| Footer links | All 12 links point to valid routes | None |
| Customer Sidebar | All links verified against routes | None |
| Seller Sidebar (new) | All 28 links verified — Custom Domain properly included | None |
| Admin Sidebar | 40+ links verified — **9 routes missing** (listed above) | High |

---

## 4. EDGE FUNCTION HEALTH

Based on recent logs, all monitored functions are healthy:
- `process-scheduled-ads` — Running, no errors
- `poll-discord-audit-log` — Running, no errors
- `modmail-response-reminder` — Running, no errors
- `check-ip-ban` — Running, responding correctly
- `claim-signup-promotion` — Running, processing users

**Note**: 155+ edge functions exist. Full runtime testing of all functions is beyond static audit scope — recommend testing critical payment flows (`create-payment-intent`, `confirm-embedded-payment`, `stripe-webhook`) end-to-end.

---

## 5. SECURITY OBSERVATIONS

| Finding | Severity | Detail |
|---------|----------|--------|
| Stripe key hardcoded as fallback | Low | `EmbeddedPaymentModal.tsx` contains the live Stripe publishable key as fallback — this is a **publishable** key (safe to expose) but makes key rotation harder |
| Admin routes have no server-side guard | Medium | All `/admin/*` routes rely on `useAdminAuth` client-side hook. RLS policies protect data, but pages themselves render before auth check completes (standard SPA pattern) |
| GDPR Compliance page inaccessible | High | Route exists but no navigation path — compliance tooling is unreachable |

---

## 6. PERFORMANCE NOTES

| Observation | Detail |
|-------------|--------|
| Lazy loading | All pages properly lazy-loaded with `React.lazy` — good |
| QueryClient config | 5-min stale time, 30-min GC — appropriate for marketplace |
| Bundle splitting | 200+ lazy imports creates many chunks — acceptable for this scale |

---

## RECOMMENDED FIXES (Priority Order)

### P0 — Must Fix
1. **Add 9 missing admin sidebar entries** — Recruiters (4 pages), Bot Codes, Referrals, Email Templates, IP Shield Custom Plans, GDPR Compliance are all inaccessible via navigation

### P1 — Should Fix
2. **Add missing seller sidebar entries** — Promote, Tax Summary, Settings > Notifications
3. **Fix Store About param inconsistency** — Change `:slug` to `:storeSlug` for consistency with other store routes
4. **Delete orphaned files** — `Marketplace.tsx` and `Landing.tsx` are dead code

### P2 — Nice to Have
5. **Add `ContactMessages` route** if the feature is still needed, or delete the file
6. **Consolidate duplicate routes** — `/marketplace` → redirect to `/products`, `/downloads` and `/orders` → redirect to `/purchases`

---

## IMPLEMENTATION SUMMARY

**Files to modify:**
- `src/components/admin/AdminSidebar.tsx` — Add 9 missing nav entries across appropriate groups
- `src/components/seller/SellerSidebar.tsx` — Add Promote, Tax Summary, Settings > Notifications entries
- `src/components/AppRoutes.tsx` — Fix `:slug` → `:storeSlug` on store about route

**Files to delete:**
- `src/pages/Marketplace.tsx` (501 lines, unused)
- `src/pages/Landing.tsx` (unused)
- `src/pages/admin/ContactMessages.tsx` (if feature deprecated)

No database changes required. No edge function changes required.

