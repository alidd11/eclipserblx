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

/** Patterns that indicate a chunk/module load failure */
const CHUNK_ERROR_PATTERNS = [
  'module script',
  'dynamically imported module',
  'load failed',
  'failed to fetch',
  'loading chunk',
  'loading css chunk',
  'chunkloaderror',
  'importing a module script failed',
  'not a valid javascript mime type',
  'application/octet-stream',
];

function isChunkErrorMessage(msg: string): boolean {
  const normalized = msg.toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern));
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

  // On admin routes, use a longer cooldown to avoid Cloudflare challenge loops,
  // but still allow ONE automatic recovery per session.
  if (window.location.pathname.startsWith('/admin')) {
    const ADMIN_KEY = 'chunk-admin-recovered';
    try {
      if (sessionStorage.getItem(ADMIN_KEY)) {
        console.warn(`[ChunkError] ${reason} on admin route — already recovered once, skipping`);
        return;
      }
      sessionStorage.setItem(ADMIN_KEY, '1');
    } catch {
      // If sessionStorage fails, skip recovery to be safe
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

  // Only trigger on errors with a clear chunk-related message.
  // Don't trigger on silent asset failures (no message) — these are often
  // false positives from analytics scripts, ad blockers, or extension resources.
  if (message.trim() && isChunkErrorMessage(`${message} ${targetUrl}`)) {
    handleChunkError('Static module/chunk load failure');
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
// fails after restore — don't blindly reload on every bfcache hit.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    // Test if modules are still functional by attempting a trivial dynamic import.
    // Only trigger recovery if the import actually fails.
    import('./chunkErrorHandler' /* self-reference, always exists */).catch(() => {
      handleChunkError('Page restored from bfcache with stale modules');
    });
  }
});
