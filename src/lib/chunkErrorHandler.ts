// Auto-recover from stale module imports after deployments.
// If cached HTML references JS chunks that no longer exist (hash changed),
// force a one-time cache-busted reload to fetch fresh assets.

const COOLDOWN_KEY = 'chunk-reload-ts';
const COOLDOWN_MS = 120000; // 2-minute cooldown between automated recoveries
const CACHE_BUST_PARAM = '__chunk';

/** Safe sessionStorage wrapper — returns null on any failure (private browsing, quota, etc.) */
function safeGet(k: string): string | null {
  try { return sessionStorage.getItem(k); } catch { return null; }
}
function safeSet(k: string, v: string) {
  try { sessionStorage.setItem(k, v); } catch { /* ignore */ }
}

function isInCooldown(): boolean {
  const ts = safeGet(COOLDOWN_KEY);
  if (!ts) return false;
  return Date.now() - parseInt(ts, 10) < COOLDOWN_MS;
}

/**
 * STRICT patterns — only match genuine chunk/module load failures.
 * Excludes generic 'failed to fetch' / 'networkerror' which can fire from
 * normal API calls, analytics, ad blockers, or extension resources.
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
 * Safari-specific patterns that indicate a module script load failure
 * (only valid when combined with a chunk asset URL).
 */
const SAFARI_MODULE_PATTERNS = [
  'load failed',
  'module script',
];

function isChunkErrorMessage(msg: string): boolean {
  const normalized = msg.toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function isSafariModuleError(msg: string): boolean {
  const normalized = msg.toLowerCase();
  return SAFARI_MODULE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function isChunkAssetUrl(url: string): boolean {
  return /\/assets\/.+\.(js|css)(\?|$)/i.test(url);
}

function getEventTargetUrl(target: EventTarget | null): string {
  if (!(target instanceof Element)) return '';
  if (target instanceof HTMLScriptElement) return target.src || '';
  if (target instanceof HTMLLinkElement) return target.href || '';
  return '';
}

function buildCacheBustedUrl(base: string = window.location.href): string {
  const url = new URL(base, window.location.origin);
  url.searchParams.set(CACHE_BUST_PARAM, Date.now().toString());
  return url.toString();
}

function isAlreadyCacheBusted(): boolean {
  try {
    const url = new URL(window.location.href, window.location.origin);
    return url.searchParams.has(CACHE_BUST_PARAM);
  } catch {
    return false;
  }
}

async function clearRuntimeCaches() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    } catch {
      // ignore
    }
  }

  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch {
      // ignore
    }
  }
}

function performHardRecovery(reason: string) {
  console.log(`[ChunkError] ${reason} — forcing cache-busted hard reload`);
  safeSet(COOLDOWN_KEY, Date.now().toString());

  void clearRuntimeCaches().finally(() => {
    window.location.replace(buildCacheBustedUrl());
  });
}

function handleChunkError(reason: string) {
  if (isInCooldown()) {
    console.warn('[ChunkError] Recovery already attempted recently, skipping');
    return;
  }

  if (isAlreadyCacheBusted()) {
    console.warn(`[ChunkError] ${reason} on an already cache-busted URL, skipping auto-recovery`);
    return;
  }

  // On admin routes, allow ONE automatic recovery per session.
  if (window.location.pathname.startsWith('/admin')) {
    const ADMIN_KEY = 'chunk-admin-recovered';
    try {
      if (sessionStorage.getItem(ADMIN_KEY)) {
        console.warn(`[ChunkError] ${reason} on admin route — already recovered once, skipping`);
        return;
      }
      sessionStorage.setItem(ADMIN_KEY, '1');
    } catch {
      return;
    }
  }

  performHardRecovery(reason);
}

// Catch static module script failures (including Safari MIME/module script errors)
window.addEventListener('error', (e) => {
  const message = [
    e.message || '',
    e.error instanceof Error ? e.error.message : '',
  ].join(' ');

  const targetUrl = getEventTargetUrl(e.target);

  // Skip empty messages (extensions, ad blockers, analytics)
  if (!message.trim()) return;

  // Direct match on strict chunk patterns
  if (isChunkErrorMessage(`${message} ${targetUrl}`)) {
    handleChunkError('Static module/chunk load failure');
    return;
  }

  // Safari module errors ('load failed', 'module script') — only if the
  // failing resource is actually a chunk asset (not an API call or image)
  if (targetUrl && isChunkAssetUrl(targetUrl) && isSafariModuleError(message)) {
    handleChunkError('Safari module script load failure for chunk asset');
    return;
  }
}, true);

// Catch dynamic import() failures
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason;
  const message = typeof reason === 'string' ? reason : reason?.message || '';
  const name = typeof reason === 'object' && reason ? (reason as { name?: string }).name || '' : '';

  if (isChunkErrorMessage(`${name} ${message}`)) {
    e.preventDefault();
    handleChunkError('Dynamic import rejection');
  }
});

// Safari BFCache recovery: when page is restored from bfcache after backgrounding,
// modules can resume in a stale state. Only reload if a dynamic import actually
// fails after restore.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    import('./chunkErrorHandler' /* self-reference, always exists */).catch(() => {
      handleChunkError('Page restored from bfcache with stale modules');
    });
  }
});
