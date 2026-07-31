# MEMORY: Health Sentinel

## RUN COUNT
1

## LAST RUN SHA
67cdedc  (origin/main at run 1 — next run diffs against this)

## WHAT I DID LAST RUN
Run 1 (2026-07-28, baseline/proof): ran tsc/build/vitest/eslint on main. All green
(tsc clean, build ok, 115 tests pass, 0 eslint errors). No diff to scan (first run).
No fixes needed → no PR. Checker subagent independently confirmed PASS.

## WHAT WORKED
- The four gates (tsc, build, vitest, eslint-errors) ran cleanly and fast.
- The separate checker caught real gaps instead of rubber-stamping.

## WHAT FAILED
- Nothing broke. But the checker was not handed `vite build` in its prompt.
  NEXT RUN: pass CHECKER.md verbatim to the checker (it already lists build) so
  the evaluator verifies build independently too.

## OPEN ITEMS
- ~680 eslint warnings (0 errors) — mostly `any` in payment/payout edge functions
  (verify-payment, wise-payout, etc.). Allowed by config; a real risk surface.
  Trend down over time; do NOT batch-fix.
- Checks don't cover RLS / auth guards / live data (sandbox can't reach live
  Supabase). When a diff touches those, escalate verification to Lovable.
- BOT NOT DEPLOYED: the bot is being hosted on RAILWAY (fly.toml removed; the bot
  was never actually running on Fly — bot_error_logs/mod_actions/command_usage are
  all empty). Deploy config is `eclipse-portal-bot/railway.json`. It goes live only
  after the user deploys on Railway (connect repo, root dir `eclipse-portal-bot`,
  set env from .env.example) AND runs `npm run register` (publishes the 6 new
  slash commands). Until then no bot is running.
- BOT UPTIME (real-time) is NOT covered by this loop — the env can't reach the
  Railway health endpoint. Real-time monitoring must be an external uptime service
  pointed at the Railway `/health` URL (now truthful — returns 503 when the gateway
  is down). The loop only guards the bot's uptime-critical *code* from regressions.
- KNOWN DRIFT: src/data/portalBotFiles.ts (the in-app "Portal Bot Setup" snapshot)
  embeds an OLDER index.js than the real bot — missing the partials/health/watchdog
  fixes. Its deploy file was pointed at railway.json, but a full snapshot re-sync is
  still a follow-up.
- BOT DOWNLOAD WATERMARKING GAP (security follow-up, needs Lovable): `/retrieve`
  signs the raw `asset_file_url` from the product-assets bucket directly, so it
  BYPASSES the per-buyer `.lua` watermarking + `additional_asset_files` bundling that
  the website's `download-asset` edge function does. Bot downloads of script products
  are therefore un-watermarked. Fix (security-sensitive, edge-function change → human
  PR, HIGH-RISK, do NOT auto-merge): either (1) add a bot-secret-authenticated
  server-to-server path to `download-asset` so the bot delegates to the same
  watermark/bundle logic, or (2) add a `download.getSignedAsset` op to bot-gateway
  that replicates it. Option 1 preferred (single source of truth). Ownership gating
  and download logging in the bot are already correct; only the watermark step is
  missing. (As of 2026-07-29 the bot delivers files as direct Discord attachments,
  so there's no longer a raw storage URL exposed to the customer.)
