import { handleCors, jsonOk, internalError } from "../_shared/edge-response.ts";

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const CF_ZONE_ID = Deno.env.get("CLOUDFLARE_ZONE_ID");
    if (!CF_TOKEN || !CF_ZONE_ID) return jsonOk({ error: "Missing secrets" }, 500);

    const headers: Record<string, string> = { Authorization: `Bearer ${CF_TOKEN}` };
    
    // Get account ID
    const zoneResp = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`, { 
      headers: { ...headers, "Content-Type": "application/json" } 
    });
    const zoneData = await zoneResp.json();
    const accountId = zoneData.result?.account?.id;

    // Download the actual deployed worker script
    const scriptResp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/eclipse-og-proxy`,
      { headers }
    );
    const contentType = scriptResp.headers.get("content-type") || "";
    let scriptContent: string;
    
    if (contentType.includes("multipart")) {
      // Worker scripts come back as multipart
      const text = await scriptResp.text();
      // Extract the JS content from multipart
      const parts = text.split(/--[a-zA-Z0-9]+/);
      const jsPart = parts.find(p => p.includes("application/javascript"));
      scriptContent = jsPart ? jsPart.split("\r\n\r\n").slice(1).join("\r\n\r\n").trim() : text.slice(0, 2000);
    } else {
      scriptContent = await scriptResp.text();
    }

    // Check for potential issues
    const hasExportDefault = scriptContent.includes("export default");
    const hasFetchHandler = scriptContent.includes("async fetch");
    const hasShareHandler = scriptContent.includes("/share/");
    const hasServeOg = scriptContent.includes("serveOg");
    const scriptLength = scriptContent.length;

    // Also check if maybe there's a Transform Rule or Origin Rule interfering
    const transformResp = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/rulesets/phases/http_request_transform/entrypoint`,
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
    const transformText = await transformResp.text();

    const originResp = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/rulesets/phases/http_request_origin/entrypoint`,
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
    const originText = await originResp.text();

    return jsonOk({
      scriptAnalysis: {
        contentType,
        length: scriptLength,
        hasExportDefault,
        hasFetchHandler,
        hasShareHandler,
        hasServeOg,
        first500: scriptContent.slice(0, 500),
        last200: scriptContent.slice(-200),
      },
      transformRules: transformText.slice(0, 1000),
      originRules: originText.slice(0, 1000),
    });
  } catch (e) {
    return internalError(e);
  }
});
