// Auto-recover from stale module imports after deployments.
// If cached HTML references JS chunks that no longer exist (hash changed),
// force a one-time reload to fetch fresh assets. Cooldown prevents loops on iOS/Safari.

const KEY = 'chunk-reload';
const COOLDOWN_KEY = 'chunk-reload-ts';
const COOLDOWN_MS = 120000; // 2-minute cooldown between chunk-error reloads

function isInCooldown(): boolean {
  try {
    const ts = sessionStorage.getItem(COOLDOWN_KEY);
    if (!ts) return false;
    return Date.now() - parseInt(ts, 10) < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function handleChunkError() {
  // If we're in cooldown, don't reload again — prevents Safari crash loops
  if (isInCooldown()) {
    console.warn('[ChunkError] In cooldown, skipping reload');
    return;
  }

  const alreadyReloaded = sessionStorage.getItem(KEY);
  if (!alreadyReloaded) {
    console.log('[ChunkError] Stale chunk detected, reloading once');
    sessionStorage.setItem(KEY, '1');
    sessionStorage.setItem(COOLDOWN_KEY, Date.now().toString());
    window.location.reload();
  } else {
    // Already tried once, clear flag and give up
    console.warn('[ChunkError] Already reloaded once, giving up');
    sessionStorage.removeItem(KEY);
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

// Clear flag on successful load
sessionStorage.removeItem(KEY);
