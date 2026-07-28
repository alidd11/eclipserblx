// Client for the `bot-gateway` edge function.
//
// On Lovable Cloud the service_role key is never exposed to external hosts, so
// the bot cannot talk to the database directly. Instead it POSTs { op, params }
// to the bot-gateway edge function (which runs inside Cloud, holds the service
// role, and performs the privileged work). Auth is a shared secret sent in the
// `x-bot-secret` header and checked against BOT_GATEWAY_SECRET on the server.
import { config } from './config.js';

/**
 * Call a bot-gateway operation.
 * @param {string} op       Operation name (see the gateway's switch).
 * @param {object} [params] Operation parameters.
 * @returns {Promise<any>}  The `data` field of the gateway response.
 * @throws  If the request fails or the gateway returns an `error`.
 */
export async function gatewayCall(op, params = {}) {
  if (!config.gatewaySecret) {
    throw new Error('BOT_GATEWAY_SECRET is not set — cannot call bot-gateway');
  }

  let res;
  try {
    res = await fetch(config.gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-secret': config.gatewaySecret,
      },
      body: JSON.stringify({ op, params }),
    });
  } catch (err) {
    throw new Error(`bot-gateway ${op} network error: ${err?.message || err}`);
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`bot-gateway ${op} returned non-JSON (status ${res.status})`);
  }

  if (!res.ok || json?.error) {
    throw new Error(`bot-gateway ${op} failed (status ${res.status}): ${json?.error || 'unknown error'}`);
  }
  return json.data;
}
