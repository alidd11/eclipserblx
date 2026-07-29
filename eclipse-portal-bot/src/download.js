import { config } from './config.js';

/**
 * Request a buyer-specific, ownership-checked download from the download-asset
 * edge function.
 */
export async function requestDownload({ productId, userId, fileIndex = 0 }) {
  if (!config.gatewaySecret) {
    throw new Error('BOT_GATEWAY_SECRET is not set — cannot request a download');
  }

  let res;
  try {
    res = await fetch(`${config.supabaseUrl}/functions/v1/download-asset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-secret': config.gatewaySecret,
      },
      body: JSON.stringify({ productId, userId, fileIndex }),
    });
  } catch (err) {
    throw new Error(`download-asset network error: ${err?.message || err}`);
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`download-asset returned non-JSON (status ${res.status})`);
  }

  if (!res.ok || json?.error) {
    throw new Error(`download-asset failed (status ${res.status}): ${json?.error || 'unknown error'}`);
  }

  return json;
}
