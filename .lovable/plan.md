
# RoleplayHub Improvement Plan

Scope is bounded to **measured** issues from `pg_stat_statements` plus a focused UX/reliability pass and one new Orion-powered capability. Honours project memory (fix + optimisation; no scope creep, no Eclipse+ branding).

## 1. Performance (biggest wins, evidence-based)

Top time-sinks from the database right now:

| Rank | Query                                                                       | Total time | Calls   | Issue                                       |
| ---- | --------------------------------------------------------------------------- | ---------- | ------- | ------------------------------------------- |
| 1    | `staff_activity` full scan with count                                       | 287 s      | 1,476   | No index on filter; count over all rows     |
| 2    | `page_visits` repeated full-table scans (5 variants)                        | ~315 s     | 4,600+  | No indexes on `created_at`, `is_new_visitor`, no aggregate cache |
| 3    | `products` filtered by `category_id + is_active + release_at`               | 108 s      | 22,948  | Missing composite index                     |
| 4    | `profiles.last_seen` heartbeat update                                       | 79 s       | 35,841  | Client heartbeats too often                 |
| 5    | `products` feed JOIN stores+categories ORDER BY `created_at`                | 76 s       | —       | Missing `(is_active, created_at DESC)` index |

### Fixes

- Add composite indexes via migration:
  - `products(category_id, is_active, release_at)`
  - `products(is_active, created_at DESC) WHERE store_id IS NOT NULL`
  - `page_visits(created_at DESC)`, `page_visits(is_new_visitor)`
  - `staff_activity(user_id, created_at DESC)`
- **Analytics queries** (`page_visits.browser/device_type/page_path` SELECT-all): switch admin analytics to a materialised view refreshed every 5 minutes via pg_cron, instead of scanning the whole table each load.
- **Presence heartbeat**: throttle client `last_seen` update from "every interaction" to **once per 60 s** + on visibility change. Drops ~35k writes/day.
- Validate each with `EXPLAIN (ANALYZE, BUFFERS)` before/after.

## 2. UX polish

- Tab bar + sidebar: audit for any remaining `hover:scale` (memory forbids); replace with `active:scale-[0.97]`.
- Admin analytics page: skeleton matches final layout (avoid layout shift while the new materialised view loads).
- Product grid feed: add `contain: layout paint` on cards to stop reflow during image load.

## 3. Reliability / security

- Wrap the new Orion `orion_enqueue_event` trigger function with a per-statement try/catch so a queue failure can never block an order/incident insert.
- Add `idx_orion_event_outbox(status, created_at)` so the dispatcher's `WHERE status='pending'` query stays fast as the outbox grows.
- Run the security linter and address only **net-new** warnings from recent migrations (the 71 pre-existing ones are out of scope per memory).

## 4. New capability — Orion auto-findings

Plug into the Orion subsystem already shipped:

- DB job (pg_cron, every 10 min) scans for anomalies and inserts into `orion_findings`:
  - Orders stuck in `pending` > 30 min
  - Failed payouts in the last 24 h
  - Slow query candidates (table + mean_ms) from `pg_stat_statements`
  - Outbox events stuck `pending` with `attempts >= 5`
- `OrionActivityPanel` gets a third tab **"Findings"** showing severity, source, and a one-click "Open" action.

## Technical notes

```text
migration  → indexes + materialised view + trigger hardening
edge fn    → orion-scan (cron-invoked) writes to orion_findings
frontend   → throttle hook for last_seen; new Findings tab
```

No schema-breaking changes. All indexes use `IF NOT EXISTS`. No new tables.

## Out of scope

- Re-introducing Eclipse+ branding
- Recruiter system
- Any change requiring next-themes / light mode
- Touching auto-generated Supabase files
