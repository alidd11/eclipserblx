import { handleCors, jsonOk, jsonError } from "../_shared/edge-response.ts";

const CF_API = "https://api.cloudflare.com/client/v4";

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN")!;
    const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID")!;

    if (action === "list-worker-routes") {
      const resp = await fetch(`${CF_API}/zones/${cfZoneId}/workers/routes`, {
        headers: { Authorization: `Bearer ${cfToken}` },
      });
      const data = await resp.json();
      return jsonOk(data);
    }

    if (action === "list-custom-hostnames") {
      const resp = await fetch(`${CF_API}/zones/${cfZoneId}/custom_hostnames?per_page=50`, {
        headers: { Authorization: `Bearer ${cfToken}` },
      });
      const data = await resp.json();
      return jsonOk(data);
    }

    if (action === "list-workers") {
      // List all workers scripts in the account
      const resp = await fetch(`${CF_API}/zones/${cfZoneId}/workers/scripts`, {
        headers: { Authorization: `Bearer ${cfToken}` },
      });
      const data = await resp.json();
      return jsonOk(data);
    }

    if (action === "check-zone-settings") {
      // Check SSL settings, Always Use HTTPS, etc.
      const sslResp = await fetch(`${CF_API}/zones/${cfZoneId}/settings/ssl`, {
        headers: { Authorization: `Bearer ${cfToken}` },
      });
      const sslData = await sslResp.json();

      const httpsResp = await fetch(`${CF_API}/zones/${cfZoneId}/settings/always_use_https`, {
        headers: { Authorization: `Bearer ${cfToken}` },
      });
      const httpsData = await httpsResp.json();

      // Check Custom Hostname fallback origin
      const fallbackResp = await fetch(`${CF_API}/zones/${cfZoneId}/custom_hostnames/fallback_origin`, {
        headers: { Authorization: `Bearer ${cfToken}` },
      });
      const fallbackData = await fallbackResp.json();

      return jsonOk({ ssl: sslData?.result, always_use_https: httpsData?.result, fallback_origin: fallbackData?.result });
    }

    if (action === "delete-custom-hostname") {
      const hostnameId = body?.hostname_id;
      if (!hostnameId) return jsonError("hostname_id required", 400);
      const resp = await fetch(`${CF_API}/zones/${cfZoneId}/custom_hostnames/${hostnameId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${cfToken}` },
      });
      const data = await resp.json();
      return jsonOk(data);
    }

    return jsonError("Unknown action", 400);
  } catch (e: any) {
    return jsonError(e.message, 500);
  }
});
