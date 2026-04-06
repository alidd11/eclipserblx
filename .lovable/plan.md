

## Database Table Audit — Can We Trim 225 Tables?

### The Short Answer

**225 tables is reasonable for your feature set**, but **~8 tables are genuinely dead** (zero rows AND zero code references). The rest are either actively used or support features that exist in the UI but haven't been used by sellers yet.

For context: Shopify runs thousands of tables. Stripe has hundreds. 225 for a marketplace with a Discord bot, IP protection, affiliate system, and seller tools is within enterprise norms.

### What We Found

| Category | Count | Action |
|---|---|---|
| Actively used (have data) | 123 | Keep |
| Empty but referenced in code (awaiting first use) | ~94 | Keep — these are features like bundles, campaigns, store pages, announcements |
| **Truly dead** (0 rows, no code references anywhere) | **~8** | Safe to drop |

### Dead Tables (Safe to Remove)

These have zero rows AND are not referenced in any frontend component, hook, or edge function:

1. `ip_shield_custom_plans` — planned IP Shield pricing, never built
2. `ip_abuse_complaints` — planned abuse reporting, never wired
3. `ip_email_messages` — planned IP email system, never wired
4. `ip_email_threads` — planned IP email threading, never wired
5. `ip_copy_detections` — planned copy detection, never wired
6. `ip_detection_snapshots` — planned detection snapshots, never wired
7. `promotion_analytics` — planned promo tracking, never wired
8. `takedown_activity_log` — planned takedown logging, never wired

### What This Saves

- **Schema clarity** — 8 fewer tables in the types file and migration history
- **Security surface** — 8 fewer tables that need RLS auditing
- **Developer cognitive load** — cleaner schema when onboarding new team members

### What We Will NOT Touch

- Any table with data (even 1 row)
- Any table referenced in frontend code, edge functions, or bot code
- Any table that's part of a foreign key chain with active tables

### Implementation

**Single migration** that drops the 8 dead tables. No frontend changes needed since nothing references them.

### Risk

Very low — these tables are orphaned schema with no data and no code paths. The migration uses `IF EXISTS` and `CASCADE` to handle any leftover FK references cleanly.

