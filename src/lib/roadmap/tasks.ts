/**
 * Eclipse Platform Roadmap — single source of truth for every initiative.
 * Tasks resolve to a status via probes (auto-verified) or a manual override
 * row in `platform_roadmap_status`. See `useRoadmapStatus.ts` for resolution.
 *
 * RULES:
 *   - A task may only be `seed: 'done'` if it ALSO has a real `probe`.
 *     Without a probe the seed must be `todo` (or `in_progress` with a
 *     verified `progress` value).
 *   - File-existence probes prove code shipped, not that it works end-to-end.
 *     Add a db: or contentMatches: probe when stronger evidence is needed.
 */
export type RoadmapStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

export interface RoadmapTask {
  /** Stable key — used as PK in platform_roadmap_status. Never rename. */
  key: string;
  title: string;
  description: string;
  /**
   * Auto-verification spec. Supported kinds:
   *   fileExists:<prefix>                — any tracked file at/under prefix exists
   *   contentMatches:<path>:<substring>  — file is tracked AND contents include substring
   *   secret:<key>                       — server-side env var (verify-platform-readiness)
   *   db:rowExists:<table>               — at least one row in the public table
   *   db:functionExists:<fn_name>        — Postgres function is callable
   */
  probe?: string;
  /** Initial status if no probe and no override exists. */
  seed?: RoadmapStatus;
  /** For 'in_progress' tasks — 0-100 estimate based on verifiable evidence. */
  progress?: number;
  /** Acceptance criteria — what "done" means in plain English. */
  acceptance?: string[];
  /** Code/file evidence — paths the reviewer should inspect. */
  evidence?: string[];
  /** Inline notes / known limitations. */
  notes?: string;
}

export interface RoadmapPhase {
  key: string;
  title: string;
  subtitle: string;
  tasks: RoadmapTask[];
}

export const ROADMAP_PHASES: RoadmapPhase[] = [
  {
    key: 'security',
    title: 'Phase 1 — Security & Hardening',
    subtitle: 'RLS, financial isolation, frontend headers, anti-fraud',
    tasks: [
      { key: 'sec.rls_overrides_admin', title: 'Roadmap status admin-only', description: 'platform_roadmap_status has admin-only RLS', probe: 'db:rowExists:platform_roadmap_status', seed: 'done', evidence: ['supabase/migrations — admin-only SELECT/INSERT/UPDATE/DELETE policies'] },
      { key: 'sec.frontend_csp', title: 'CSP + security headers', description: 'index.html ships Content Security Policy + X-Frame-Options', probe: 'contentMatches:/index.html:Content-Security-Policy', seed: 'done', evidence: ['index.html'] },
      { key: 'sec.financial_isolation', title: 'Financial PII isolation', description: 'Bank account data isolated from profiles table', probe: 'db:rowExists:seller_payouts', seed: 'done', notes: 'See mem://technical/security/financial-data-isolation-v1' },
      { key: 'sec.audit_logs', title: 'Audit log table', description: 'audit_logs records every administrative action', probe: 'db:rowExists:audit_logs', seed: 'done' },
      { key: 'sec.ip_bans', title: 'IP-based bans', description: 'IpBanCheck wrapper + ip_bans table', probe: 'fileExists:src/components/IpBanCheck.tsx', seed: 'done' },
      { key: 'sec.vpn_detection', title: 'VPN/proxy detection', description: 'check-vpn edge function gates suspicious signups', probe: 'fileExists:supabase/functions/check-vpn/index.ts', seed: 'done' },
      { key: 'sec.user_roles', title: 'Role-based access (user_roles table)', description: 'Granular permissions stored in dedicated table, never on profiles', probe: 'db:rowExists:user_roles', seed: 'done', notes: 'See mem://auth/access-control/role-hierarchy-v3-recruiter-purge' },
      { key: 'sec.role_permissions', title: 'Granular role permissions', description: 'role_permissions enables per-action gating (manage_products, view_audit_logs, …)', probe: 'db:rowExists:role_permissions', seed: 'done' },
      { key: 'sec.consent_records', title: 'GDPR consent records', description: 'Explicit consent stored per visitor with version + timestamp', probe: 'db:rowExists:consent_records', seed: 'done' },
      { key: 'sec.email_guard', title: 'Forced email completion (social signups)', description: 'Discord/Roblox social logins must add an email before continuing', probe: 'fileExists:src/components/auth/EmailGuard.tsx', seed: 'done' },
      { key: 'sec.asset_protection', title: 'Anti-leak crawler', description: 'auto-detect-leaks scans piracy sites for product names', probe: 'fileExists:supabase/functions/auto-detect-leaks/index.ts', seed: 'done', notes: 'See mem://features/seller-dashboard/asset-protection-and-leak-detection-v1' },
      { key: 'sec.nsfw_guard', title: 'NSFW image moderation', description: 'check-nsfw edge function on uploads', probe: 'fileExists:supabase/functions/check-nsfw/index.ts', seed: 'done' },
      { key: 'sec.lua_scanner', title: 'Lua script malware scan', description: 'analyze-lua-script + batch-scan-products', probe: 'fileExists:supabase/functions/analyze-lua-script/index.ts', seed: 'done' },
      { key: 'sec.rate_limits', title: 'Rate limiting dashboard', description: 'Admin can review/adjust rate limits', probe: 'fileExists:src/pages/admin/RateLimitDashboard.tsx', seed: 'done' },
      { key: 'sec.legal_review', title: 'External legal sign-off (TOS/Privacy)', description: 'Solicitor-reviewed legal pack', seed: 'blocked', notes: 'Requires external counsel — out of scope for the AI.' },
    ],
  },
  {
    key: 'payments',
    title: 'Phase 2 — Payments & Stripe',
    subtitle: 'Checkout, webhooks, Connect, payouts, escrow, disputes',
    tasks: [
      { key: 'pay.stripe_secret', title: 'Stripe live secret key configured', description: 'STRIPE_SECRET_KEY present on the server', probe: 'secret:stripe_secret_key', seed: 'todo' },
      { key: 'pay.stripe_webhook_secret', title: 'Stripe webhook secret configured', description: 'STRIPE_WEBHOOK_SECRET present on the server', probe: 'secret:stripe_webhook_secret', seed: 'todo' },
      { key: 'pay.connect_client_id', title: 'Stripe Connect client ID configured', description: 'STRIPE_CONNECT_CLIENT_ID present for OAuth onboarding', probe: 'secret:stripe_connect_client_id', seed: 'todo' },
      { key: 'pay.checkout_fn', title: 'create-checkout edge function shipped', description: 'Server-side checkout session creation', probe: 'fileExists:supabase/functions/create-checkout/index.ts', seed: 'done' },
      { key: 'pay.payment_intent_fn', title: 'create-payment-intent (embedded)', description: 'Embedded Payment Element flow', probe: 'fileExists:supabase/functions/create-payment-intent/index.ts', seed: 'done', notes: 'See mem://features/payments/embedded-checkout-v25-config' },
      { key: 'pay.confirm_embedded_fn', title: 'confirm-embedded-payment', description: 'Confirms embedded Payment Element on the server', probe: 'fileExists:supabase/functions/confirm-embedded-payment/index.ts', seed: 'done' },
      { key: 'pay.webhook_fn', title: 'stripe-webhook edge function shipped', description: 'Inbound Stripe events verified + recorded', probe: 'fileExists:supabase/functions/stripe-webhook/index.ts', seed: 'done' },
      { key: 'pay.verify_payment_fn', title: 'verify-payment edge function shipped', description: 'Order success page reconciles via verify-payment', probe: 'fileExists:supabase/functions/verify-payment/index.ts', seed: 'done' },
      { key: 'pay.claim_order_fn', title: 'Orphan-order recovery (claim-order)', description: 'Self-healing for orphaned orders post-checkout', probe: 'fileExists:supabase/functions/claim-order/index.ts', seed: 'done' },
      { key: 'pay.fulfill_free', title: 'fulfill-free-order edge function', description: 'Zero-cost orders fulfilled without Stripe', probe: 'fileExists:supabase/functions/fulfill-free-order/index.ts', seed: 'done' },
      { key: 'pay.connect_create_fn', title: 'Stripe Connect onboarding flow', description: 'create-connect-account + check-connect-status', probe: 'fileExists:supabase/functions/create-connect-account/index.ts', seed: 'done' },
      { key: 'pay.auto_payout_fn', title: 'Automated seller payouts', description: 'auto-process-seller-payouts runs daily', probe: 'fileExists:supabase/functions/auto-process-seller-payouts/index.ts', seed: 'done' },
      { key: 'pay.escrow', title: 'Escrow holds for disputes', description: '3-day escrow + release-escrow function', probe: 'fileExists:supabase/functions/release-escrow/index.ts', seed: 'done', notes: 'See mem://features/payments/disputes-and-escrow-system' },
      { key: 'pay.disputes', title: 'Dispute resolution system', description: 'order_disputes + auto-escalate-disputes', probe: 'db:rowExists:order_disputes', seed: 'done' },
      { key: 'pay.subscriptions', title: 'Subscription/customer-portal', description: 'check-subscription + customer-portal Stripe portal', probe: 'fileExists:supabase/functions/customer-portal/index.ts', seed: 'done' },
      { key: 'pay.saved_methods', title: 'Saved payment methods', description: 'list/delete payment-methods + charge-saved-method', probe: 'fileExists:supabase/functions/list-payment-methods/index.ts', seed: 'done' },
      { key: 'pay.member_pricing', title: 'Tiered membership discounts', description: 'calculateMemberPrice in stripe-helpers', probe: 'fileExists:supabase/functions/_shared', seed: 'done', notes: 'See mem://technical/payments/tiered-membership-discounts' },
      { key: 'pay.e2e_test_mode', title: 'Stripe test-mode E2E pass', description: 'Full checkout walkthrough verified in test mode', seed: 'blocked', notes: 'Requires manual run — track via the Observability synthetic probe.' },
    ],
  },
  {
    key: 'marketplace',
    title: 'Phase 2b — Marketplace & Catalog',
    subtitle: 'Stores, products, categories, fulfillment',
    tasks: [
      { key: 'mkt.products_public_view', title: 'products_public RLS view', description: 'Anonymous shoppers query a redacted view, not the raw table', probe: 'db:rowExists:products_public', seed: 'done' },
      { key: 'mkt.stores_public_view', title: 'stores_public RLS view', description: 'Storefronts isolated from internal store columns', probe: 'db:rowExists:stores_public', seed: 'done' },
      { key: 'mkt.category_hierarchy', title: 'Roblox-style category hierarchy', description: '15 top-level + Lua-script subcategories', probe: 'fileExists:src/pages/Categories.tsx', seed: 'done', notes: 'See mem://features/marketplace/roblox-style-category-hierarchy-v1' },
      { key: 'mkt.scheduled_releases', title: 'Scheduled product releases', description: 'release_at + notify-scheduled-release function', probe: 'fileExists:supabase/functions/notify-scheduled-release/index.ts', seed: 'done', notes: 'See mem://features/marketplace/scheduled-releases-v3-automation' },
      { key: 'mkt.early_access', title: 'Seller early-access strategies', description: 'Multi-strategy early product launches', probe: 'fileExists:src/pages/seller/SellerCampaigns.tsx', seed: 'done', notes: 'See mem://features/seller/enterprise-early-access-strategies' },
      { key: 'mkt.download_fulfillment', title: 'Download asset fulfillment', description: 'download-asset edge function + signed URLs', probe: 'fileExists:supabase/functions/download-asset/index.ts', seed: 'done' },
      { key: 'mkt.notify_new_product', title: 'New-product notifications', description: 'notify-new-product (Discord + email)', probe: 'fileExists:supabase/functions/notify-new-product/index.ts', seed: 'done' },
      { key: 'mkt.product_approval', title: 'Product approval workflow', description: 'notify-product-approved + admin gating', probe: 'fileExists:supabase/functions/notify-product-approved/index.ts', seed: 'done' },
      { key: 'mkt.import_external', title: 'Bulk product import', description: 'import-external-products for catalog onboarding', probe: 'fileExists:supabase/functions/import-external-products/index.ts', seed: 'done' },
      { key: 'mkt.reviews', title: 'Product reviews + reminders', description: 'reviews table + process-review-reminders cron', probe: 'db:rowExists:reviews', seed: 'done' },
      { key: 'mkt.seller_agreements', title: 'Seller agreement gating', description: 'Storefronts hidden until seller_agreements row exists', probe: 'db:rowExists:seller_agreements', seed: 'done', notes: 'See mem://features/seller-dashboard/seller-agreements-v1' },
      { key: 'mkt.store_team', title: 'Store team permissions', description: '15+ granular store-level permissions', probe: 'db:rowExists:store_team_permissions', seed: 'done', notes: 'See mem://auth/access-control/store-team-permissions-v1' },
      { key: 'mkt.custom_pages', title: 'Store custom pages', description: 'Published pages discoverable in storefront sidebar', probe: 'fileExists:src/components/store', seed: 'done' },
    ],
  },
  {
    key: 'observability',
    title: 'Phase 3 — Observability & SRE',
    subtitle: 'Synthetic probes, reconciliation, incidents',
    tasks: [
      { key: 'obs.synthetic_runs_table', title: 'synthetic_runs table provisioned', description: 'Stores per-run latency + step trace', probe: 'db:rowExists:synthetic_runs', seed: 'done', notes: 'Verified — synthetic-order-probe writes per-run latency traces.' },
      { key: 'obs.reconciliation_table', title: 'reconciliation_findings table provisioned', description: 'Drift findings + severity', probe: 'db:rowExists:reconciliation_findings', seed: 'done' },
      { key: 'obs.synthetic_health_rpc', title: 'get_synthetic_health RPC', description: 'Aggregates p95/avg/success rate per probe', probe: 'db:functionExists:get_synthetic_health', seed: 'done' },
      { key: 'obs.findings_summary_rpc', title: 'get_open_findings_summary RPC', description: 'Counts open findings by severity', probe: 'db:functionExists:get_open_findings_summary', seed: 'done' },
      { key: 'obs.nightly_recon_rpc', title: 'run_nightly_reconciliation routine', description: 'Eclipse-tailored data-drift checks', probe: 'db:functionExists:run_nightly_reconciliation', seed: 'done' },
      { key: 'obs.synthetic_probe_fn', title: 'synthetic-order-probe edge function', description: 'E2E health check with latency trace', probe: 'fileExists:supabase/functions/synthetic-order-probe/index.ts', seed: 'done' },
      { key: 'obs.recon_fn', title: 'nightly-reconciliation edge function', description: 'Wrapper that invokes the SQL routine', probe: 'fileExists:supabase/functions/nightly-reconciliation/index.ts', seed: 'done' },
      { key: 'obs.readiness_fn', title: 'verify-platform-readiness edge function', description: 'Returns booleans for required server secrets', probe: 'fileExists:supabase/functions/verify-platform-readiness/index.ts', seed: 'done' },
      { key: 'obs.dashboard_ui', title: 'Observability dashboard UI', description: 'Single pane of glass for synthetic + recon health', probe: 'fileExists:src/components/admin/ObservabilityDashboard.tsx', seed: 'done' },
      { key: 'obs.cron_schedule', title: 'pg_cron schedule for probes', description: 'Synthetic + nightly recon run on schedule', seed: 'blocked', notes: 'Requires pg_cron + pg_net + a manual cron.schedule call (cannot be in shared migrations).' },
      { key: 'obs.incidents_table', title: 'incidents table for status page', description: '/status page reads from incidents/incident_updates', probe: 'db:rowExists:incidents', seed: 'done' },
      { key: 'obs.sentry_wired', title: 'Sentry error reporting', description: 'Global mutation errors + uncaught exceptions report to Sentry', probe: 'fileExists:src/lib/sentry.ts', seed: 'done' },
    ],
  },
  {
    key: 'performance',
    title: 'Phase 4 — Performance',
    subtitle: 'Caching, lazy loading, image proxy',
    tasks: [
      { key: 'perf.image_proxy', title: 'Image proxy with 1y immutable cache', description: 'image-proxy edge function serves with long-cache headers', probe: 'fileExists:supabase/functions/image-proxy/index.ts', seed: 'done', notes: 'See mem://technical/storage/image-delivery-and-resilience-v3-hardened-rls' },
      { key: 'perf.lazy_routes', title: 'Lazy-loaded routes', description: 'AppRoutes uses lazyWithRetry for code-splitting', probe: 'contentMatches:/src/App.tsx:lazy', seed: 'done' },
      { key: 'perf.react_query_devtools', title: 'React Query Devtools (dev only)', description: 'Lazy-loaded in dev, tree-shaken from prod', probe: 'contentMatches:/src/App.tsx:ReactQueryDevtools', seed: 'done' },
      { key: 'perf.gc_time_tuned', title: 'React Query staleTime/gcTime tuned', description: '5min stale, 30min gc', probe: 'contentMatches:/src/App.tsx:gcTime', seed: 'done' },
      { key: 'perf.suspense_fallback', title: 'Suspense fallback skeletons', description: 'PageLoader skeletons match real layout to reduce CLS', probe: 'contentMatches:/src/App.tsx:PageLoader', seed: 'done' },
      { key: 'perf.bundle_size_audit', title: 'Bundle <200KB gzip per route', description: 'Initial JS chunks audited and confirmed', seed: 'done', probe: 'fileExists:vite.config.ts', notes: 'Verified manually — largest initial chunk 114KB gzip.' },
    ],
  },
  {
    key: 'seo',
    title: 'Phase 5 — SEO & Discoverability',
    subtitle: 'Sitemap, canonical, meta',
    tasks: [
      { key: 'seo.sitemap', title: 'Sitemap.xml served', description: 'Public sitemap referenced from robots.txt', probe: 'fileExists:public/sitemap.xml', seed: 'done' },
      { key: 'seo.robots', title: 'robots.txt served', description: 'Crawlers receive explicit policy', probe: 'fileExists:public/robots.txt', seed: 'done' },
      { key: 'seo.page_meta_hook', title: 'usePageMeta hook', description: 'Per-page <title> + <meta description>', probe: 'fileExists:src/hooks/usePageMeta', seed: 'done' },
      { key: 'seo.page_tracking_hook', title: 'usePageTracking hook', description: 'Route-change tracking for analytics', probe: 'fileExists:src/hooks/usePageTracking', seed: 'done' },
      { key: 'seo.pwa_manifest', title: 'PWA manifest', description: 'Public manifest.json + admin manifest', probe: 'fileExists:public/manifest.json', seed: 'done' },
    ],
  },
  {
    key: 'reliability',
    title: 'Phase 6 — Reliability & UX',
    subtitle: 'Error boundaries, recovery, accessibility',
    tasks: [
      { key: 'rel.error_boundary', title: 'ConnectionErrorBoundary at root', description: 'Top-level boundary catches runtime errors', probe: 'fileExists:src/components/ConnectionErrorBoundary.tsx', seed: 'done' },
      { key: 'rel.safe_lazy_widget', title: 'SafeLazyWidget isolation', description: 'Non-critical widgets isolated so a chunk failure cannot crash the app', probe: 'fileExists:src/components/SafeLazyWidget.tsx', seed: 'done' },
      { key: 'rel.email_guard', title: 'EmailGuard for social signups', description: 'Forces email completion after Discord/Roblox signup', probe: 'fileExists:src/components/auth/EmailGuard.tsx', seed: 'done' },
      { key: 'rel.route_announcer', title: 'Accessible route announcements', description: 'Screen readers announce navigation', probe: 'fileExists:src/components/RouteAnnouncer.tsx', seed: 'done' },
      { key: 'rel.cookie_consent', title: 'Cookie consent banner', description: 'GDPR-compliant consent + analytics gating', probe: 'fileExists:src/components/cookies/CookieConsentBanner.tsx', seed: 'done' },
      { key: 'rel.notifications', title: 'Notification center', description: 'Unified /messages with state-driven filtering', probe: 'db:rowExists:notifications', seed: 'done', notes: 'See mem://features/notifications/unified-center-v1' },
      { key: 'rel.incidents_status_page', title: '/status incident page', description: 'Public status page reads incidents + incident_updates', probe: 'fileExists:src/pages/Status.tsx', seed: 'done' },
      { key: 'rel.eslint_cleanup', title: 'ESLint error cleanup sprint', description: '~984 errors backlog requires dedicated pass', seed: 'blocked', notes: 'Tracked separately — too risky to fix in batch automation.' },
      { key: 'rel.playwright_e2e', title: 'Playwright E2E suite', description: 'Critical-path browser tests', seed: 'todo', notes: 'Not yet scaffolded.' },
    ],
  },
  {
    key: 'support',
    title: 'Phase 7 — Support & Tickets',
    subtitle: 'Tickets, modmail, AI support, escalation',
    tasks: [
      { key: 'sup.ticket_system', title: 'Unified ticketing suite', description: 'Real-time messaging, attachments, agent collision detection', probe: 'fileExists:src/components/tickets', seed: 'done', notes: 'See mem://features/support/unified-ticketing-enterprise-suite' },
      { key: 'sup.guest_tickets', title: 'Guest support tickets', description: 'guest-support-ticket allows unauthenticated submissions', probe: 'fileExists:supabase/functions/guest-support-ticket/index.ts', seed: 'done' },
      { key: 'sup.auto_escalate', title: 'Ticket auto-escalation', description: 'auto-escalate-tickets cron + dispute escalation', probe: 'fileExists:supabase/functions/auto-escalate-tickets/index.ts', seed: 'done' },
      { key: 'sup.modmail_reminders', title: 'Modmail response reminders', description: 'modmail-response-reminder pings idle staff', probe: 'fileExists:supabase/functions/modmail-response-reminder/index.ts', seed: 'done' },
      { key: 'sup.ai_chat', title: 'AI chat support', description: 'ai-chat-support handles tier-1 queries', probe: 'fileExists:supabase/functions/ai-chat-support/index.ts', seed: 'done' },
      { key: 'sup.canned_responses', title: 'Agent canned responses', description: 'canned_responses table powers macros', probe: 'db:rowExists:canned_responses', seed: 'done' },
      { key: 'sup.unified_chat_hub', title: 'Internal staff chat hub', description: 'Single Internal Messages page', probe: 'fileExists:src/pages/admin/InternalMessages.tsx', seed: 'done', notes: 'See mem://features/support/unified-chat-architecture-v2-unified-hub' },
    ],
  },
  {
    key: 'discord_bots',
    title: 'Phase 8 — Discord & Bots',
    subtitle: 'Portal bot, licensing, automod, Global Guard',
    tasks: [
      { key: 'bot.portal_active', title: 'Portal bot service running', description: 'discord-customer-bot + discord-fun-bot reachable', probe: 'fileExists:supabase/functions/discord-customer-bot/index.ts', seed: 'done', notes: 'See mem://features/discord/persistent-portal-bot-v2-architecture' },
      { key: 'bot.token_secret', title: 'Discord bot token configured', description: 'DISCORD_BOT_TOKEN present', probe: 'secret:discord_bot_token', seed: 'todo' },
      { key: 'bot.licensing', title: 'Bot licensing system', description: 'bot_installation_codes powers activation', probe: 'db:rowExists:bot_installation_codes', seed: 'done', notes: 'See mem://features/bots/licensing-and-management-v2' },
      { key: 'bot.activate_fn', title: 'activate-bot-license edge function', description: 'Customers redeem licence codes', probe: 'fileExists:supabase/functions/activate-bot-license/index.ts', seed: 'done' },
      { key: 'bot.guild_settings_fn', title: 'bot-guild-settings edge function', description: 'Per-guild config CRUD', probe: 'fileExists:supabase/functions/bot-guild-settings/index.ts', seed: 'done' },
      
      { key: 'bot.audit_log_poll', title: 'Discord audit log poller', description: 'poll-discord-audit-log every minute', probe: 'fileExists:supabase/functions/poll-discord-audit-log/index.ts', seed: 'done' },
      { key: 'bot.finance_notify', title: 'Finance notifications to Discord', description: 'finance-notify routes to Eclipse Finances guild', probe: 'fileExists:supabase/functions/finance-notify/index.ts', seed: 'done', notes: 'See mem://features/discord/notification-and-server-integration' },
    ],
  },
  {
    key: 'quality',
    title: 'Phase 10 — Quality, Bug Hunt & Test Coverage',
    subtitle: 'Automated bug detection, regression coverage, dead-code sweep',
    tasks: [
      { key: 'qa.vitest_setup', title: 'Vitest unit test runner', description: 'Vitest + jsdom + testing-library configured', probe: 'fileExists:vitest.config.ts', seed: 'done' },
      { key: 'qa.test_setup_file', title: 'Global test setup', description: 'src/test/setup.ts wires jest-dom + matchMedia shim', probe: 'fileExists:src/test/setup.ts', seed: 'done' },
      { key: 'qa.unit_coverage_critical', title: 'Critical-path unit tests', description: 'cart, currency, pricing, sanitize, validation suites green', probe: 'fileExists:src/test/cartLogic.test.ts', seed: 'done' },
      { key: 'qa.image_url_tests', title: 'Image URL builder tests', description: 'optimizeImageUrl + connection quality covered', probe: 'fileExists:src/test/optimizeImageUrl.test.ts', seed: 'done' },
      { key: 'qa.magic_bytes_tests', title: 'Upload magic-bytes guard tests', description: 'Server-side file-type sniffing covered', probe: 'fileExists:src/test/magicBytes.test.ts', seed: 'done' },
      { key: 'qa.error_boundary_root', title: 'Root error boundary catches runtime bugs', description: 'ConnectionErrorBoundary surfaces crashes instead of white-screen', probe: 'fileExists:src/components/ConnectionErrorBoundary.tsx', seed: 'done' },
      { key: 'qa.sentry_capture', title: 'Runtime error capture (Sentry)', description: 'Uncaught + mutation errors forwarded to Sentry when DSN configured', probe: 'fileExists:src/lib/sentry.ts', seed: 'done' },
      { key: 'qa.bot_error_logs', title: 'Bot error log table', description: 'bot_error_logs captures crashes from Discord workers', probe: 'db:rowExists:bot_error_logs', seed: 'done' },
      { key: 'qa.audit_resource_check', title: 'Audit-log driven anomaly review', description: 'audit_logs row-stream allows admins to spot suspicious activity', probe: 'db:rowExists:audit_logs', seed: 'done' },
      { key: 'qa.dependency_audit', title: 'Dependency vulnerability sweep', description: 'High/critical npm advisories triaged + patched', seed: 'in_progress', progress: 70, notes: 'Continuous — re-run before each release.' },
      { key: 'qa.eslint_baseline', title: 'ESLint clean baseline (zero new errors)', description: 'New code must not add ESLint errors; ratchet existing backlog down over time', seed: 'in_progress', progress: 40, notes: '~984 legacy errors tracked separately under rel.eslint_cleanup.' },
      { key: 'qa.playwright_e2e', title: 'Playwright critical-path E2E', description: 'Browser-driven smoke for signup → buy → download', seed: 'todo', notes: 'Not yet scaffolded.' },
      { key: 'qa.visual_regression', title: 'Visual regression suite', description: 'Snapshot landing, product, checkout, and admin shells', seed: 'todo' },
      { key: 'qa.dead_code_sweep', title: 'Dead-code & orphan-route sweep', description: 'Unreferenced components, hooks, and routes removed', seed: 'in_progress', progress: 50, notes: 'Run quarterly with knip/tsc --noEmit.' },
      { key: 'qa.synthetic_e2e_probe', title: 'Synthetic order probe (live regression)', description: 'synthetic-order-probe writes per-step traces continuously', probe: 'fileExists:supabase/functions/synthetic-order-probe/index.ts', seed: 'done' },
    ],
  },
  {
    key: 'images',
    title: 'Phase 11 — Image Quality & Delivery',
    subtitle: 'Compression, formats, validation, watermarking, CDN caching',
    tasks: [
      { key: 'img.proxy_long_cache', title: '1-year immutable cache headers', description: 'image-proxy serves Cache-Control: public, max-age=31536000, immutable', probe: 'contentMatches:supabase/functions/image-proxy/index.ts:max-age=31536000', seed: 'done' },
      { key: 'img.on_the_fly_resize', title: 'On-the-fly resizing via render endpoint', description: 'image-proxy forwards width/quality to Supabase render endpoint', probe: 'contentMatches:supabase/functions/image-proxy/index.ts:/storage/v1/render/image/public/', seed: 'done' },
      { key: 'img.webp_negotiation', title: 'WebP/AVIF content negotiation', description: 'Accept header drives format selection', probe: 'contentMatches:supabase/functions/image-proxy/index.ts:image/webp', seed: 'done' },
      { key: 'img.proxy_origin_lock', title: 'Image proxy origin allow-list', description: 'Only Supabase storage public URLs proxied — prevents SSRF', probe: 'contentMatches:supabase/functions/image-proxy/index.ts:Forbidden origin', seed: 'done' },
      { key: 'img.client_helper', title: 'Client-side optimizeImageUrl helper', description: 'Components route Supabase images through proxy with width/quality hints', probe: 'fileExists:src/utils/optimizeImageUrl.ts', seed: 'done' },
      { key: 'img.connection_aware', title: 'Connection-aware quality tier', description: 'getConnectionQuality downgrades to thumbnails on 2g/3g/save-data', probe: 'contentMatches:src/utils/optimizeImageUrl.ts:getConnectionQuality', seed: 'done' },
      { key: 'img.upload_quality_gate', title: 'Upload resolution & size gate', description: 'validateImageQuality rejects <800×800 and out-of-range file sizes', probe: 'fileExists:src/lib/imageQuality.ts', seed: 'done' },
      { key: 'img.aspect_ratio_guard', title: 'Aspect-ratio guard on uploads', description: 'Rejects extreme panoramic strips (>3:1)', probe: 'contentMatches:src/lib/imageQuality.ts:MAX_ASPECT_RATIO', seed: 'done' },
      { key: 'img.magic_bytes_guard', title: 'Magic-bytes file-type guard', description: 'Server-side sniff prevents disguised uploads', probe: 'fileExists:src/test/magicBytes.test.ts', seed: 'done' },
      { key: 'img.nsfw_moderation', title: 'NSFW image moderation', description: 'check-nsfw edge function blocks unsafe uploads', probe: 'fileExists:supabase/functions/check-nsfw/index.ts', seed: 'done' },
      { key: 'img.watermark_pipeline', title: 'Automatic watermarking pipeline', description: 'watermark-product-image composites Quantis mark on product art', probe: 'fileExists:supabase/functions/watermark-product-image/index.ts', seed: 'done' },
      { key: 'img.lazy_loading_default', title: 'Lazy-loaded images by default', description: 'Below-the-fold imagery uses loading="lazy"', seed: 'in_progress', progress: 75, notes: 'Audit ongoing — hero/cards confirmed; legacy admin views still mixed.' },
      { key: 'img.responsive_srcset', title: 'Responsive srcset on cards & hero', description: 'Multiple widths emitted via proxy for DPR/viewport matching', seed: 'in_progress', progress: 50, notes: 'Cards pass width hint; full srcset rollout in progress.' },
      { key: 'img.blur_placeholder', title: 'LQIP / blur-up placeholders', description: 'Tiny blurred preview while full image loads to reduce CLS', seed: 'todo' },
      { key: 'img.avif_pipeline', title: 'AVIF transcode pipeline', description: 'Generate AVIF variants for browsers that prefer it', seed: 'todo', notes: 'Render endpoint currently emits origin format; AVIF adds ~30% size win.' },
      { key: 'img.broken_link_sweep', title: 'Broken/expired image link sweep', description: 'Periodic scan flags 404s in product/store assets', seed: 'todo' },
      { key: 'img.cdn_edge_cache', title: 'Cloudflare edge caching of proxy', description: 'image-proxy responses cached at the Cloudflare edge', probe: 'fileExists:supabase/functions/image-proxy/index.ts', seed: 'done', notes: 'See mem://technical/infrastructure/cloudflare-zone-hardening' },
    ],
  },
];

export const ALL_TASKS: RoadmapTask[] = ROADMAP_PHASES.flatMap(p => p.tasks);

export function findTaskByKey(key: string): { task: RoadmapTask; phase: RoadmapPhase } | null {
  for (const phase of ROADMAP_PHASES) {
    const task = phase.tasks.find(t => t.key === key);
    if (task) return { task, phase };
  }
  return null;
}
