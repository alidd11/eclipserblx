// Auto-recover from stale module imports after deployments.
// If cached HTML references JS chunks that no longer exist (hash changed),
// force a one-time reload to fetch fresh assets. Cooldown prevents loops on iOS/Safari.

const KEY = 'chunk-reload';
const COOLDOWN_KEY = 'chunk-reload-ts';
const COOLDOWN_MS = 120000; // 2-minute cooldown between chunk-error reloads

/** Safe sessionStorage wrapper — returns null on any failure (private browsing, quota, etc.) */
function safeGet(k: string): string | null {
  try { return sessionStorage.getItem(k); } catch { return null; }
}
function safeSet(k: string, v: string) {
  try { sessionStorage.setItem(k, v); } catch { /* ignore */ }
}
function safeRemove(k: string) {
  try { sessionStorage.removeItem(k); } catch { /* ignore */ }
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
  'Load failed',                     // Safari-specific
  'Failed to fetch',                 // Network failure on chunk
  'Loading chunk',                   // Webpack-style
  'Loading CSS chunk',
  'ChunkLoadError',
  'Importing a module script failed', // Safari
  'not a valid JavaScript MIME type', // Safari MIME type enforcement
];

function isChunkErrorMessage(msg: string): boolean {
  return CHUNK_ERROR_PATTERNS.some(p => msg.includes(p));
}

function handleChunkError() {
  // If we're in cooldown, don't reload again — prevents Safari crash loops
  if (isInCooldown()) {
    console.warn('[ChunkError] In cooldown, skipping reload');
    return;
  }

  const alreadyReloaded = safeGet(KEY);
  if (!alreadyReloaded) {
    console.log('[ChunkError] Stale chunk detected, reloading once');
    safeSet(KEY, '1');
    safeSet(COOLDOWN_KEY, Date.now().toString());
    window.location.reload();
  } else {
    // Already tried once, clear flag and give up
    console.warn('[ChunkError] Already reloaded once, giving up');
    safeRemove(KEY);
  }
}

// Catch static module script failures (including Safari's "Load failed")
window.addEventListener('error', (e) => {
  const msg = e.message || '';
  if (isChunkErrorMessage(msg)) handleChunkError();
}, true);

// Catch dynamic import() failures
window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message || '';
  if (isChunkErrorMessage(msg)) {
    e.preventDefault();
    handleChunkError();
  }
});

// Safari BFCache recovery: when the page is restored from bfcache after
// backgrounding on iOS, modules may be in a broken state. Force a reload.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    console.log('[ChunkError] Page restored from bfcache, reloading');
    // Small delay to let the browser settle before reloading
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }
});

// Clear the reload marker only after page has fully stabilised,
// preventing premature clear → re-trigger loops on Safari.
if (document.readyState === 'complete') {
  setTimeout(() => safeRemove(KEY), 2000);
} else {
  window.addEventListener('load', () => {
    setTimeout(() => safeRemove(KEY), 2000);
  });
}
