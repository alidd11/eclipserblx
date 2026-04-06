## Automated Compliance Suite — Amazon Account Health Style

### What This Adds

A fully automated system that monitors store health, enforces listing quality, and suspends policy violators — like Amazon's Account Health dashboard. Reduces manual admin workload and ensures marketplace quality at scale.

---

### 1. Store Health Score System (Database + Edge Function)

Create a `store_health_scores` table that tracks key metrics per store:
- **Dispute rate** — % of orders with refund requests
- **Response time** — average seller response to support tickets  
- **Listing quality** — % of products with descriptions >50 chars, 2+ images
- **Delivery rate** — % of orders fulfilled (not cancelled)
- **Policy violations** — count of active warnings/strikes

A scheduled edge function (`calculate-store-health`) runs daily to recalculate scores for all active stores and flag stores below threshold.

**Scoring**: 0–100 scale. Below 40 = "At Risk", below 20 = "Critical" (auto-suspend candidate).

---

### 2. Compliance Violations & Strikes Table

Create `compliance_violations` table tracking:
- Store ID, violation type (inactive, low_quality_listing, high_dispute_rate, policy_breach)
- Severity (warning, strike, suspension)
- Auto-resolved flag (clears when metric improves)
- Created/resolved timestamps

**Auto-detection rules** (run by scheduled function):
- Store inactive >30 days with listed products → "inactive" warning
- Product with <30 char description or 0 images → "low_quality_listing" warning
- Dispute rate >15% over rolling 30 days → "high_dispute_rate" strike
- 3+ active strikes → auto-suspension (store `is_active = false`)

---

### 3. Seller-Facing Account Health Page (`/seller/account-health`)

Shows sellers their own health score with:
- Overall score gauge (colour-coded green/amber/red)
- Metric breakdown (dispute rate, response time, listing quality, delivery)
- Active violations with severity badges and resolution guidance
- Historical score trend (last 30 days)

---

### 4. Admin Compliance Dashboard (`/admin/compliance`)

Shows admins:
- Stores sorted by health score (worst first)
- Filter by status: All / At Risk / Critical / Suspended
- Bulk actions: Issue warning, apply strike, suspend, reinstate
- Violation log with auto/manual distinction

---

### 5. Scheduled Automation

A `calculate-store-health` edge function runs daily via pg_cron:
- Recalculates all store health scores
- Auto-creates violations for policy breaches
- Auto-suspends stores with 3+ strikes
- Auto-resolves violations when metrics improve
- Sends seller notifications for new violations

---

### Files Changed
- **Migration** — Create `store_health_scores` and `compliance_violations` tables with RLS
- `supabase/functions/calculate-store-health/index.ts` — Scheduled health calculator
- `src/pages/seller/SellerAccountHealth.tsx` — Seller-facing health dashboard
- `src/pages/admin/ComplianceDashboard.tsx` — Admin compliance overview
- `src/components/AppRoutes.tsx` — Add new routes
- `src/components/seller/SellerSidebar.tsx` — Add Account Health link
- `src/components/admin/AdminSidebar.tsx` — Add Compliance link
- **pg_cron job** — Schedule daily health calculation
