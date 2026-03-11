import { handleCors, jsonOk, internalError } from "../_shared/edge-response.ts";

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!CF_TOKEN || !CF_ZONE_ID) {
      return jsonOk({ error: "Missing CF secrets" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "read";
    const headers = { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" };

    // Get account ID from zone
    const zoneResp = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`, { headers });
    const zoneData = await zoneResp.json();
    const accountId = zoneData?.result?.account?.id;
    if (!accountId) return jsonOk({ error: "Could not get account ID", zoneData }, 500);

    const workerName = "eclipse-og-proxy";

    if (action === "read") {
      const resp = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`,
        { headers: { Authorization: `Bearer ${CF_TOKEN}` } }
      );
      const contentType = resp.headers.get("content-type") || "";
      const text = await resp.text();
      return jsonOk({ status: resp.status, content_type: contentType, script: text.substring(0, 10000) });
    }

    if (action === "update") {
      // Full Worker script with OG proxy + fixed fetchOrigin
      const workerScript = body.script;
      if (!workerScript) return jsonOk({ error: "script required in body" }, 400);

      const formData = new FormData();
      const metadata = JSON.stringify({
        main_module: "worker.mjs",
        compatibility_date: "2024-01-01",
      });
      formData.append("metadata", new Blob([metadata], { type: "application/json" }));
      formData.append("worker.mjs", new Blob([workerScript], { type: "application/javascript+module" }), "worker.mjs");
      
      const resp = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${CF_TOKEN}` },
          body: formData,
        }
      );
      const result = await resp.json();
      return jsonOk({ status: resp.status, success: result.success, errors: result.errors });
    }

    return jsonOk({ error: "Unknown action" }, 400);
  } catch (e) {
    return internalError(e);
  }
});
