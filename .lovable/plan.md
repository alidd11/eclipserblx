

## Edge Function Cleanup & Consolidation Plan

You currently have **182 edge functions**. An enterprise company running this many functions is accumulating unnecessary cold-start overhead, deployment time, and invocation costs. Here's the breakdown.

---

### Category 1: Dead Functions — Delete (15 functions)

These have **zero frontend references** and are not called by any cron job, webhook, or other function. They are leftover from infrastructure experiments or deprecated features.

| Function | Reason |
|---|---|
| `cloudflare-diagnose` | One-time infra debug tool, no references |
| `cloudflare-dns-fix` | One-time fix, no references |
| `cloudflare-emergency-fix` | One-time fix, no references |
| `cloudflare-pro-optimize` | One-time setup, no references |
| `fix-cloudflare-security` | One-time fix, no references |
| `diagnose-worker` | Superseded by v2, no references |
| `diagnose-worker-v2` | One-time debug tool, no references |
| `restore-worker-routes` | One-time fix, no references |
| `setup-bot-subdomains` | One-time setup, no references |
| `setup-custom-hostnames` | One-time setup, no references |
| `setup-wildcard-dns` | One-time setup, no references |
| `setup-worker-custom-domains` | One-time setup, no references |
| `test-worker-alive` | Dev-only test, no references |
| `test-worker-bot` | Dev-only test, no references |
| `ionos-dns-manager` | One-time DNS setup, no references |

**Savings**: Eliminates 15 deployed functions from the runtime. Reduces deployment time and removes attack surface.

---

### Category 2: Dead Functions — Delete (6 more)

These also have no frontend or cron references:

| Function | Reason |
|---|---|
| `check-dns-setup` | No frontend references |
| `check-wise-funding` | No frontend references |
| `check-paypal-funding` | No frontend references |
| `deploy-cloudflare-worker` | No frontend references |
| `purge-cloudflare-cache` | No frontend references |
| `auto-post-tweet` | No references (superseded by `post-twitter-update`) |

---

### Category 3: Duplicate Functions — Merge (3 pairs → 3 functions)

| Keep | Delete | Reason |
|---|---|---|
| `dynamic-sitemap` | `sitemap` | Both generate sitemaps; `dynamic-sitemap` is the newer, more complete version |
| `send-discord-webhook` | `send-advertisement-discord-webhook` | Both send Discord embeds; the ad webhook is a specialized copy of the generic one — merge ad-specific logic into the generic function with an `type: 'advertisement'` parameter |
| `send-product-drop-webhook` | `send-product-drop-embed` | Both handle new product Discord notifications; consolidate into one with a `format` parameter |

---

### Category 4: Discord Stickies/Embeds — Merge into Single Handler (5 → 1)

These five functions all do the same thing: send a static Discord embed to a configured channel. They should be one `send-discord-embed` function with a `template` parameter.

- `send-ads-channel-sticky`
- `send-partnership-sticky`
- `send-free-products-rules`
- `send-rules-embed`
- `send-community-relations-embed`

**None** have frontend references — they're triggered manually from admin panels or not at all.

---

### Category 5: Cron Frequency Tuning (Cost Reduction)

| Function | Current | Recommended | Reason |
|---|---|---|---|
| `poll-discord-audit-log` | Every 2 min | Every 10 min | Audit logs don't need near-real-time; reduces 720→144 invocations/day |
| `auto-register-discord-commands` | Daily | Weekly or on-demand | Commands rarely change |

---

### Summary

| Action | Count | Impact |
|---|---|---|
| Delete dead functions | **21** | Removes unused code, reduces deploy time and attack surface |
| Merge duplicates | **6 → 3** | Eliminates redundant code and maintenance |
| Consolidate stickies | **5 → 1** | One template-driven function instead of five copies |
| Tune cron frequencies | **2** | ~580 fewer daily invocations |
| **Net reduction** | **~28 fewer functions** | From 182 → ~154 deployed functions |

### Files Changed
- **Delete**: 28 function directories from `supabase/functions/`
- **Edit**: `send-discord-webhook/index.ts` (add ad webhook capability)
- **Edit**: `send-product-drop-webhook/index.ts` (absorb embed variant)
- **Create**: `send-discord-embed/index.ts` (unified sticky/embed handler)
- **Migration**: Update cron schedules for `poll-discord-audit-log` and `auto-register-discord-commands`
- **Frontend**: Update any imports referencing merged function names (minimal — most merged functions have no frontend callers)

