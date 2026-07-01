// Orion outbound webhook: signs POSTs with HMAC-SHA256 in Stripe's scheme.
// Header format: `X-Discord-Signature: t=<unix_ts>,v1=<hex_hmac>`
// signedString = `${ts}.${body}`  (literal dot, no whitespace)

import crypto from 'crypto';

const URL_ENV = 'ORION_WEBHOOK_URL';
const SECRET_ENV = 'DISCORD_WEBHOOK_SECRET';
const DEFAULT_URL = 'https://orion-production-21df.up.railway.app/hooks/discord';

/**
 * Compute the signature header exactly as the receiver expects.
 * Exposed so it can be unit-tested / logged during development.
 *
 * @param {string} body   The exact raw JSON string being sent as the request body.
 * @param {string} secret The shared HMAC secret.
 * @param {string} [ts]   Unix timestamp (seconds) as a string. Defaults to now.
 * @returns {{ ts: string, v1: string, header: string }}
 */
export function signOrionPayload(body, secret, ts = Math.floor(Date.now() / 1000).toString()) {
  const signedString = `${ts}.${body}`;
  const v1 = crypto.createHmac('sha256', secret).update(signedString, 'utf8').digest('hex');
  return { ts, v1, header: `t=${ts},v1=${v1}` };
}

/**
 * Fire-and-forget POST to the Orion webhook with a signed body.
 * Never throws — logs and swallows errors so bot event flow isn't affected.
 *
 * @param {'member_join'|'member_leave'} type
 * @param {{ guild: string, member_id: string, member_count_now: number }} data
 */
export async function sendOrionWebhook(type, data) {
  const url = process.env[URL_ENV] || DEFAULT_URL;
  const secret = process.env[SECRET_ENV];

  if (!secret) {
    console.warn(`[orion-webhook] Skipped ${type}: missing ${SECRET_ENV}`);
    return;
  }

  // IMPORTANT: sign the exact bytes we send. JSON.stringify once, use that string
  // for BOTH the signature input and the request body. Do not re-serialize.
  const body = JSON.stringify({ type, data });
  const { header } = signOrionPayload(body, secret);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Discord-Signature': header,
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[orion-webhook] ${type} -> ${res.status} ${res.statusText} ${text.slice(0, 200)}`);
    } else {
      console.log(`[orion-webhook] ${type} delivered (guild=${data.guild}, count=${data.member_count_now})`);
    }
  } catch (err) {
    console.error(`[orion-webhook] ${type} POST failed:`, err?.message || err);
  }
}
