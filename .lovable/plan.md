

## Enterprise Gaps — What's Missing

After auditing the full codebase against platforms like Shopify, Amazon Seller Central, and Stripe, here are the gaps ranked by business impact:

---

### 1. Changelog / What's New Page (High Impact, Low Effort)
Every enterprise platform (Stripe, Shopify, Linear) has a `/changelog` page showing platform updates. You have none. This builds trust, reduces support tickets ("where did X go?"), and signals active development.

**What to build**: A `/changelog` page pulling from a `changelog_entries` table with title, description, category (Feature/Fix/Improvement), and date. Admin UI to create entries. Optional "New" badge on the sidebar when unread entries exist.

---

### 2. Seller Webhook Notifications (High Impact, Medium Effort)
Enterprise seller platforms let sellers receive programmatic notifications when orders come in, disputes open, or payouts complete. Currently all notifications are in-app or Discord only — no way for sellers to integrate with their own systems.

**What to build**: A `seller_webhooks` table where sellers register endpoint URLs. Fire webhooks on key events (new order, dispute opened, payout sent). Include HMAC signature verification. Pro-tier only feature.

---

### 3. Data Export / Right to Portability (Medium Impact, Low Effort)
GDPR Article 20 requires data portability. You have retention policies but no self-service export. Enterprise platforms always have a "Download my data" button.

**What to build**: An account settings button that triggers an edge function to compile the user's orders, profile, reviews, and messages into a ZIP of JSON/CSV files, then emails a download link.

---

### 4. API Rate Limit Dashboard (Medium Impact, Low Effort)
You have rate limiting on edge functions but no visibility for admins. Enterprise platforms show rate limit hits, top offenders, and blocked requests.

**What to build**: A simple admin page reading from the existing rate limit logs showing top IPs, blocked request counts, and trends over 24h/7d.

---

### 5. Accessibility (a11y) Baseline (Medium Impact, Medium Effort)
Enterprise marketplaces meet WCAG 2.1 AA. Common gaps: missing `aria-label` on icon-only buttons, insufficient color contrast in muted text, no skip-to-content link, focus trap issues in modals.

**What to build**: A systematic pass adding `aria-label` to all icon-only buttons, a skip-to-content link in the layout shell, and ensuring all interactive elements have visible focus rings.

---

### 6. Bulk Operations for Admin (Medium Impact, Medium Effort)
Admin pages like Users, Orders, Products lack multi-select + bulk actions. Enterprise admin panels always have checkbox selection with bulk approve/reject/export.

**What to build**: A reusable `BulkActionBar` component that appears when items are selected, with actions like bulk approve, bulk reject, bulk export CSV.

---

### 7. Scheduled Maintenance Notices (Low Impact, Low Effort)
Your Status page shows incidents but has no way to announce *planned* maintenance windows in advance. Enterprise platforms show a banner site-wide before scheduled downtime.

**What to build**: A `scheduled_maintenance` flag on the incidents table. When an upcoming maintenance window exists, show a subtle banner across the site.

---

### Recommendation

Tackle them in this order for maximum ROI:
1. **Changelog** — instant trust signal, 1-2 hour build
2. **Data Export** — GDPR compliance gap, 1-2 hour build  
3. **Scheduled Maintenance banners** — quick win, 30 min
4. **Bulk Admin Operations** — operational efficiency
5. **Seller Webhooks** — differentiator for Pro tier
6. **a11y Baseline** — legal/compliance
7. **Rate Limit Dashboard** — admin visibility

Would you like me to build any or all of these?

