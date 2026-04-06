

## Automated Leak Detection for Pro Sellers

### What This Does

An automated system that periodically scans the web for your sellers' products being shared on known leak/piracy sites. When a match is found, the seller gets an in-app notification and a pre-filled leak report — no manual upload needed.

---

### How It Works

```text
┌─────────────────────┐
│  Scheduled CRON job │  (every 6 hours)
│  auto-detect-leaks  │
└────────┬────────────┘
         │
         ▼
┌─────────────────────────────┐
│ For each Pro seller's store │
│ → Get active product names  │
│ → Build search queries      │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Firecrawl Search API        │
│ Query: "{product name}      │
│   site:v3rmillion.net OR    │
│   site:robloxscripts.com    │
│   OR site:pastebin.com ..." │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Deduplicate against         │
│ leak_scan_results table     │
│ (already-seen URLs skipped) │
└────────┬────────────────────┘
         │  New matches only
         ▼
┌─────────────────────────────┐
│ Create seller_notification  │
│ + auto leak_report entry    │
│ with source URL & snippet   │
└─────────────────────────────┘
```

---

### Database Changes

**New table: `leak_scan_results`**
- `id`, `store_id`, `product_id`, `source_url`, `source_domain`, `matched_query`, `snippet`, `confidence`, `dismissed`, `created_at`
- RLS: sellers see only their own store's results

**New columns on `stores`:**
- `leak_scan_enabled` (boolean, default false) — Pro sellers toggle this on

---

### New Edge Function: `auto-detect-leaks`

Scheduled via pg_cron every 6 hours:
1. Query all stores where `leak_scan_enabled = true` AND seller has active Pro subscription
2. For each store, get active product names
3. For each product, search Firecrawl with queries targeting known Roblox leak sites:
   - `v3rmillion.net`, `robloxscripts.com`, `pastebin.com`, `scriptblox.com`, `rscripts.net`, `github.com` (public repos)
4. Deduplicate results against `leak_scan_results` (by URL hash)
5. For new matches: insert into `leak_scan_results`, create a `seller_notification` with type `leak_detected`
6. Rate limit: max 10 products per store per scan cycle to stay within Firecrawl quotas

---

### Seller UI Changes

**Asset Protection page (`SellerLeakReports.tsx`):**
- Add a "Auto-Scan" toggle (Pro-gated) at the top
- New "Auto-Detected Leaks" section showing results from `leak_scan_results`
- Each result shows: product name, source URL (linked), snippet preview, detected date, "Dismiss" button
- Badge count on the sidebar for unread leak detections

**Notification Center:**
- New notification type `leak_detected` renders with a warning icon and links to the Asset Protection page

---

### Pro Gating

- Toggle only appears for Pro subscribers
- Edge function skips stores without active Pro subscription
- Free sellers continue using manual upload (existing flow unchanged)

---

### Files Changed

- **Migration**: Create `leak_scan_results` table + add `leak_scan_enabled` to `stores`
- **Create**: `supabase/functions/auto-detect-leaks/index.ts`
- **Edit**: `src/pages/seller/SellerLeakReports.tsx` — add auto-scan toggle + results section
- **Edit**: `src/components/seller/NotificationCenter.tsx` — render `leak_detected` type
- **pg_cron**: Schedule the function every 6 hours

### Risk

Low — no existing flows are modified. The manual report system stays intact. Firecrawl is already connected. The scan is additive and writes to a new table.

