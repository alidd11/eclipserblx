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

// Catch static module script failures
window.addEventListener('error', (e) => {
  if (e.message?.includes('module script')) handleChunkError();
}, true);

// Catch dynamic import() failures
window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message || '';
  if (msg.includes('dynamically imported module') || msg.includes('module script')) {
    e.preventDefault();
    handleChunkError();
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
