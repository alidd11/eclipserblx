// Auto-recover from stale module imports after deployments.
// If cached HTML references JS chunks that no longer exist (hash changed),
// force a one-time reload to fetch fresh assets. SessionStorage flag prevents loops.

const KEY = 'chunk-reload';

function handleChunkError() {
  const alreadyReloaded = sessionStorage.getItem(KEY);
  if (!alreadyReloaded) {
    sessionStorage.setItem(KEY, '1');
    window.location.reload();
  } else {
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
