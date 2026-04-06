/**
 * Shared chunk/module recovery utility.
 *
 * Used by:
 *  - chunkErrorHandler (global listeners)
 *  - ConnectionErrorBoundary (top-level React boundary)
 *  - RouteErrorBoundary (route-level React boundary)
 *
 * Handles Safari/WebKit-specific chunk patterns, runtime cache clearing,
 * and anti-loop guards while always allowing user-initiated retries.
 */

const COOLDOWN_KEY = 'chunk-reload-ts';
const ATTEMPT_KEY = 'chunk-attempt-count';
const COOLDOWN_MS = 120_000; // 2-minute cooldown between auto-recoveries
const MAX_AUTO_ATTEMPTS = 2; // max auto-recoveries before giving up
const CACHE_BUST_PARAM = '__chunk';

// ── Pattern detection ──────────────────────────────────────────────

/**
 * STRICT chunk/module patterns — excludes generic 'failed to fetch' / 'networkerror'
 */
const CHUNK_ERROR_PATTERNS = [
  'dynamically imported module',
  'importing a module script failed',
  'loading chunk',
  'loading css chunk',
  'chunkloaderror',
  'not a valid javascript mime type',
  'application/octet-stream',
];

/**
 * Safari-specific patterns — these MUST appear together with chunk/module context
 * to avoid false positives from generic "Load failed" network errors (e.g. Discord API).
 */
const SAFARI_CONTEXT_PATTERNS = [
  'module script',
  'importing a module',
  'import(',
];

export function isChunkError(error: Error | null): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const name = (error.name || '').toLowerCase();
  const combined = `${name} ${msg}`;

  // Strict chunk patterns — any of these alone is enough
  if (CHUNK_ERROR_PATTERNS.some((p) => combined.includes(p))) return true;

  // Safari "load failed" — only treat as chunk error if it also mentions module/import context
  if (combined.includes('load failed')) {
    return SAFARI_CONTEXT_PATTERNS.some((p) => combined.includes(p));
  }

  return false;
}

export function isChunkErrorMessage(msg: string): boolean {
  const normalized = msg.toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((p) => normalized.includes(p));
}

export function isSafariModuleError(msg: string): boolean {
  const normalized = msg.toLowerCase();
  // Only true if "load failed" appears with module/import context
  if (normalized.includes('load failed')) {
    return SAFARI_CONTEXT_PATTERNS.some((p) => normalized.includes(p));
  }
  return normalized.includes('module script');
}

export function isChunkAssetUrl(url: string): boolean {
  return /\/assets\/.+\.(js|css)(\?|$)/i.test(url);
}

// ── SessionStorage helpers ─────────────────────────────────────────

function safeGet(k: string): string | null {
  try { return sessionStorage.getItem(k); } catch { return null; }
}

function safeSet(k: string, v: string) {
  try { sessionStorage.setItem(k, v); } catch { /* ignore */ }
}

// ── Cache clearing ─────────────────────────────────────────────────

async function clearRuntimeCaches(): Promise<void> {
  // Unregister all service workers to prevent stale chunk serving
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    } catch { /* ignore */ }
  }

  // Delete all caches
  if ('caches' in window) {
    try {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    } catch { /* ignore */ }
  }
}

// ── URL helpers ────────────────────────────────────────────────────

function buildFreshUrl(base: string = window.location.href): string {
  const url = new URL(base, window.location.origin);
  // Remove any existing __chunk param so we get a truly fresh one
  url.searchParams.delete(CACHE_BUST_PARAM);
  url.searchParams.set(CACHE_BUST_PARAM, Date.now().toString());
  return url.toString();
}

// ── Anti-loop guards ───────────────────────────────────────────────

function isAutoRecoveryAllowed(): boolean {
  // Cooldown check
  const ts = safeGet(COOLDOWN_KEY);
  if (ts && Date.now() - parseInt(ts, 10) < COOLDOWN_MS) return false;

  // Attempt count check
  const attempts = parseInt(safeGet(ATTEMPT_KEY) || '0', 10);
  if (attempts >= MAX_AUTO_ATTEMPTS) return false;

  return true;
}

// ── Recovery entry points ──────────────────────────────────────────

function logDiagnostics(source: string, reason: string, error?: Error | null) {
  console.debug(`[ChunkRecovery] source=${source} reason="${reason}"`, {
    pathname: window.location.pathname,
    search: window.location.search,
    errorName: error?.name,
    errorMessage: error?.message?.slice(0, 200),
  });
}

function performReload(targetUrl?: string) {
  safeSet(COOLDOWN_KEY, Date.now().toString());
  const attempts = parseInt(safeGet(ATTEMPT_KEY) || '0', 10);
  safeSet(ATTEMPT_KEY, (attempts + 1).toString());

  const freshUrl = buildFreshUrl(targetUrl || window.location.href);

  void clearRuntimeCaches().finally(() => {
    window.location.replace(freshUrl);
  });
}

/**
 * Attempt automatic recovery (used by global listeners and componentDidCatch).
 * Respects cooldown and attempt limits. Returns false if recovery was skipped.
 */
export function attemptAutoRecovery(source: string, reason: string, error?: Error | null): boolean {
  logDiagnostics(source, reason, error);

  if (!isAutoRecoveryAllowed()) {
    console.warn(`[ChunkRecovery] Auto-recovery blocked (cooldown or max attempts), showing fallback`);
    return false;
  }

  // Admin routes: allow only ONE automatic recovery per session
  if (window.location.pathname.startsWith('/admin')) {
    const ADMIN_KEY = 'chunk-admin-recovered';
    try {
      if (sessionStorage.getItem(ADMIN_KEY)) {
        console.warn(`[ChunkRecovery] Admin route — already recovered once, skipping`);
        return false;
      }
      sessionStorage.setItem(ADMIN_KEY, '1');
    } catch { return false; }
  }

  performReload();
  return true;
}

/**
 * User-initiated recovery. Always forces a fresh cache-busted reload,
 * bypassing all cooldowns and attempt limits.
 */
export function forceUserRecovery(targetUrl?: string) {
  logDiagnostics('user', 'Manual retry', null);
  // Reset attempt counter so future auto-recovery can work
  safeSet(ATTEMPT_KEY, '0');
  performReload(targetUrl);
}

/**
 * Get event target URL for error listener usage.
 */
export function getEventTargetUrl(target: EventTarget | null): string {
  if (!(target instanceof Element)) return '';
  if (target instanceof HTMLScriptElement) return target.src || '';
  if (target instanceof HTMLLinkElement) return target.href || '';
  return '';
}
