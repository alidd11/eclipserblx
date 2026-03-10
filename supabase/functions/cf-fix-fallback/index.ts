import { handleCors, jsonOk, jsonError } from "../_shared/edge-response.ts";

const CF_API = "https://api.cloudflare.com/client/v4";

async function cfFetch(token: string, url: string, init?: RequestInit) {
  const resp = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return resp.json();
}

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
  const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
  if (!CF_TOKEN || !CF_ZONE_ID) return jsonError("Missing CF secrets", 500);

  const base = `${CF_API}/zones/${CF_ZONE_ID}`;
  const results: Record<string, unknown> = {};

  // Step 1: Find stores.eclipserblx.com DNS record
  const dnsList = await cfFetch(CF_TOKEN, `${base}/dns_records?name=stores.eclipserblx.com&type=A`);
  results.current_dns = dnsList;

  if (dnsList?.result?.[0]) {
    const record = dnsList.result[0];
    // Step 2: Set it to proxied (orange cloud)
    const patchResult = await cfFetch(CF_TOKEN, `${base}/dns_records/${record.id}`, {
      method: "PATCH",
      body: JSON.stringify({ proxied: true }),
    });
    results.proxy_update = patchResult;
  } else {
    results.proxy_update = "No A record found for stores.eclipserblx.com";
  }

  // Step 3: Get current fallback origin status
  const currentFallback = await cfFetch(CF_TOKEN, `${base}/custom_hostnames/fallback_origin`);
  results.current_fallback = currentFallback;

  // Step 4: Set fallback origin to stores.eclipserblx.com
  const setFallback = await cfFetch(CF_TOKEN, `${base}/custom_hostnames/fallback_origin`, {
    method: "PUT",
    body: JSON.stringify({ origin: "stores.eclipserblx.com" }),
  });
  results.new_fallback = setFallback;

  // Step 5: Verify new fallback origin status
  const verifyFallback = await cfFetch(CF_TOKEN, `${base}/custom_hostnames/fallback_origin`);
  results.verify_fallback = verifyFallback;

  return jsonOk(results);
});
