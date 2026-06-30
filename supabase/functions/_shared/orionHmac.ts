// Shared HMAC-SHA256 signer/verifier for Orion webhook traffic.
// Header format mirrors Stripe: `t=<unix_ts>,v1=<hex_sig>`.
// Replay window: 5 minutes.

const enc = new TextEncoder();

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signOrionPayload(
  secret: string,
  body: string,
  timestamp = Math.floor(Date.now() / 1000),
): Promise<string> {
  const sig = await hmacHex(secret, `${timestamp}.${body}`);
  return `t=${timestamp},v1=${sig}`;
}

export async function verifyOrionSignature(
  secret: string,
  body: string,
  header: string | null,
  toleranceSec = 300,
): Promise<boolean> {
  if (!header) return false;
  try {
    const parts = Object.fromEntries(
      header.split(",").map((p) => {
        const i = p.indexOf("=");
        return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
      }),
    );
    const ts = parseInt(parts.t ?? "", 10);
    const v1 = parts.v1;
    if (!ts || !v1) return false;
    if (Math.abs(Math.floor(Date.now() / 1000) - ts) > toleranceSec) return false;
    const expected = await hmacHex(secret, `${ts}.${body}`);
    if (expected.length !== v1.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}
