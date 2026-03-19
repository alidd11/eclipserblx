// Auto-recover from stale module imports after deployments.
// Delegates to shared chunkRecovery utility for consistent behavior.

import {
  attemptAutoRecovery,
  isChunkErrorMessage,
  isSafariModuleError,
  isChunkAssetUrl,
  getEventTargetUrl,
} from './chunkRecovery';

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
    attemptAutoRecovery('globalError', 'Static module/chunk load failure');
    return;
  }

  // Safari module errors ('load failed', 'module script') — only if the
  // failing resource is actually a chunk asset (not an API call or image)
  if (targetUrl && isChunkAssetUrl(targetUrl) && isSafariModuleError(message)) {
    attemptAutoRecovery('globalError', 'Safari module script load failure for chunk asset');
    return;
  }
}, true);

// Catch dynamic import() failures
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason;
  const message = typeof reason === 'string' ? reason : reason?.message || '';
  const name = typeof reason === 'object' && reason ? (reason as { name?: string }).name || '' : '';
  const combined = `${name} ${message}`;

  if (isChunkErrorMessage(combined) || (isSafariModuleError(combined) && combined.toLowerCase().includes('module'))) {
    e.preventDefault();
    attemptAutoRecovery('unhandledRejection', 'Dynamic import rejection');
  }
});

// Safari BFCache recovery
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    import('./chunkRecovery').catch(() => {
      attemptAutoRecovery('pageshow', 'Page restored from bfcache with stale modules');
    });
  }
});
