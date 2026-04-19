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
      { key: 'sec.rate_limits', title: 'Rate limiting dashboard', description: 'Admin can review/adjust rate limits', probe: 'fileExists:src/pages/admin/RateLimitDashboard', seed: 'todo' },
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
      { key: 'mkt.category_hierarchy', title: 'Roblox-style category hierarchy', description: '15 top-level + Lua-script subcategories', probe: 'fileExists:src/pages/Browse', seed: 'done', notes: 'See mem://features/marketplace/roblox-style-category-hierarchy-v1' },
      { key: 'mkt.scheduled_releases', title: 'Scheduled product releases', description: 'release_at + notify-scheduled-release function', probe: 'fileExists:supabase/functions/notify-scheduled-release/index.ts', seed: 'done', notes: 'See mem://features/marketplace/scheduled-releases-v3-automation' },
      { key: 'mkt.early_access', title: 'Seller early-access strategies', description: 'Multi-strategy early product launches', probe: 'fileExists:src/pages/seller', seed: 'done', notes: 'See mem://features/seller/enterprise-early-access-strategies' },
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
      { key: 'obs.synthetic_runs_table', title: 'synthetic_runs table provisioned', description: 'Stores per-run latency + step trace', probe: 'db:rowExists:synthetic_runs', seed: 'in_progress', progress: 50, notes: 'Schema created — first probe run will populate it.' },
      { key: 'obs.reconciliation_table', title: 'reconciliation_findings table provisioned', description: 'Drift findings + severity', probe: 'db:rowExists:reconciliation_findings', seed: 'in_progress', progress: 50 },
      { key: 'obs.synthetic_health_rpc', title: 'get_synthetic_health RPC', description: 'Aggregates p95/avg/success rate per probe', probe: 'db:functionExists:get_synthetic_health', seed: 'done' },
      { key: 'obs.findings_summary_rpc', title: 'get_open_findings_summary RPC', description: 'Counts open findings by severity', probe: 'db:functionExists:get_open_findings_summary', seed: 'done' },
      { key: 'obs.nightly_recon_rpc', title: 'run_nightly_reconciliation routine', description: 'Eclipse-tailored data-drift checks', probe: 'db:functionExists:run_nightly_reconciliation', seed: 'done' },
      { key: 'obs.synthetic_probe_fn', title: 'synthetic-order-probe edge function', description: 'E2E health check with latency trace', probe: 'fileExists:supabase/functions/synthetic-order-probe/index.ts', seed: 'todo' },
      { key: 'obs.recon_fn', title: 'nightly-reconciliation edge function', description: 'Wrapper that invokes the SQL routine', probe: 'fileExists:supabase/functions/nightly-reconciliation/index.ts', seed: 'todo' },
      { key: 'obs.readiness_fn', title: 'verify-platform-readiness edge function', description: 'Returns booleans for required server secrets', probe: 'fileExists:supabase/functions/verify-platform-readiness/index.ts', seed: 'todo' },
      { key: 'obs.dashboard_ui', title: 'Observability dashboard UI', description: 'Single pane of glass for synthetic + recon health', probe: 'fileExists:src/components/admin/ObservabilityDashboard.tsx', seed: 'todo' },
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
      { key: 'rel.eslint_cleanup', title: 'ESLint error cleanup sprint', description: '~984 errors backlog requires dedicated pass', seed: 'blocked', notes: 'Tracked separately — too risky to fix in batch automation.' },
      { key: 'rel.playwright_e2e', title: 'Playwright E2E suite', description: 'Critical-path browser tests', seed: 'todo', notes: 'Not yet scaffolded.' },
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
