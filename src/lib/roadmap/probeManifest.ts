/**
 * Build-time-ish manifest of files that exist in the project. We resolve these
 * via dynamic import.meta.glob so probes can verify "did this code ship?".
 *
 * Only glob client-safe paths. Edge functions, supabase migrations, and other
 * server-only files live in STATIC_PRESENT and are tracked manually — we list
 * a path here when a roadmap probe needs to verify it shipped.
 */
const modules = import.meta.glob([
  '/public/manifest-*.json',
  '/public/icons/**',
  '/src/lib/**',
  '/src/components/**',
  '/src/contexts/**',
  '/src/pages/**',
  '/src/hooks/**',
  '/src/integrations/**',
], { eager: false });

/**
 * Eager raw-text glob — used by `contentMatches:` probes that verify a file
 * actually contains a given token (e.g. CSP header on index.html).
 */
const rawSources = import.meta.glob<string>([
  '/index.html',
  '/src/App.tsx',
  '/src/main.tsx',
  '/src/lib/sentry.ts',
], { eager: true, query: '?raw', import: 'default' });

/**
 * Files known to exist that we deliberately don't glob (server-only,
 * root-level configs, public well-known files).
 */
const STATIC_PRESENT = new Set<string>([
  // Root configs
  'vite.config.ts',
  'tailwind.config.ts',
  'package.json',
  'tsconfig.json',
  // Public well-known / SEO
  'public/robots.txt',
  'public/sitemap.xml',
  'public/manifest.json',
  'public/manifest-admin.json',
  // Edge functions Eclipse depends on (admin-tracked)
  'supabase/functions/verify-payment/index.ts',
  'supabase/functions/create-checkout/index.ts',
  'supabase/functions/stripe-webhook/index.ts',
  'supabase/functions/claim-order/index.ts',
  'supabase/functions/image-proxy/index.ts',
  'supabase/functions/synthetic-order-probe/index.ts',
  'supabase/functions/nightly-reconciliation/index.ts',
  'supabase/functions/verify-platform-readiness/index.ts',
  'supabase/functions/create-payment-intent/index.ts',
  'supabase/functions/confirm-embedded-payment/index.ts',
  'supabase/functions/fulfill-free-order/index.ts',
  'supabase/functions/create-connect-account/index.ts',
  'supabase/functions/auto-process-seller-payouts/index.ts',
  'supabase/functions/release-escrow/index.ts',
  'supabase/functions/customer-portal/index.ts',
  'supabase/functions/list-payment-methods/index.ts',
  'supabase/functions/_shared',
  'supabase/functions/notify-scheduled-release/index.ts',
  'supabase/functions/download-asset/index.ts',
  'supabase/functions/notify-new-product/index.ts',
  'supabase/functions/notify-product-approved/index.ts',
  'supabase/functions/import-external-products/index.ts',
  'supabase/functions/check-vpn/index.ts',
  'supabase/functions/auto-detect-leaks/index.ts',
  'supabase/functions/check-nsfw/index.ts',
  'supabase/functions/analyze-lua-script/index.ts',
  'supabase/functions/guest-support-ticket/index.ts',
  'supabase/functions/auto-escalate-tickets/index.ts',
  'supabase/functions/modmail-response-reminder/index.ts',
  'supabase/functions/ai-chat-support/index.ts',
  'supabase/functions/discord-customer-bot/index.ts',
  
  'supabase/functions/poll-discord-audit-log/index.ts',
  'supabase/functions/finance-notify/index.ts',
  'supabase/functions/activate-bot-license/index.ts',
  'supabase/functions/bot-guild-settings/index.ts',
  'supabase/functions/create-affiliate-connect-account/index.ts',
  'supabase/functions/create-advertisement-checkout/index.ts',
  'supabase/functions/process-scheduled-ads/index.ts',
  'supabase/functions/domain-subscription/index.ts',
]);

const presentPaths = new Set<string>([
  ...STATIC_PRESENT,
  ...Object.keys(modules).map(p => p.replace(/^\//, '')),
]);

export function fileExists(prefix: string): boolean {
  for (const p of presentPaths) {
    if (p === prefix || p.startsWith(prefix)) return true;
  }
  return false;
}

/** Used by the detail page so admins can see what the probe sees. */
export function listFilesUnder(prefix: string): string[] {
  const out: string[] = [];
  for (const p of presentPaths) {
    if (p === prefix || p.startsWith(prefix)) out.push(p);
  }
  return out.sort();
}

/**
 * True iff `path` is tracked by the eager raw-source glob AND its contents
 * contain `needle` (case-sensitive substring).
 */
export function fileContains(path: string, needle: string): boolean {
  const key = path.startsWith('/') ? path : `/${path}`;
  const src = rawSources[key];
  if (typeof src !== 'string') return false;
  return src.includes(needle);
}
