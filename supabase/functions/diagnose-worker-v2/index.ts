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
    const rawText = await scriptResp.text();
    const rawLength = rawText.length;
    
    // Check key markers in raw text (before any parsing)
    const rawHasExportDefault = rawText.includes("export default");
    const rawHasFetch = rawText.includes("async fetch");
    const rawHasShare = rawText.includes("/share/");
    const rawHasServeOg = rawText.includes("serveOg");
    const rawHasServe404 = rawText.includes("serve404");
    const rawHasFetchOrigin = rawText.includes("fetchOrigin");

    // Try to extract just the JS from multipart
    let extractedLength = 0;
    let extractedLast500 = "";
    if (contentType.includes("multipart")) {
      // Find the boundary from content-type
      const boundaryMatch = contentType.match(/boundary=(.+)/);
      const boundary = boundaryMatch?.[1] || "";
      
      // Split by actual boundary (not regex)
      const parts = rawText.split("--" + boundary);
      const jsPart = parts.find(p => p.includes("application/javascript") || p.includes("worker.js"));
      if (jsPart) {
        const bodyStart = jsPart.indexOf("\r\n\r\n");
        if (bodyStart >= 0) {
          const jsContent = jsPart.slice(bodyStart + 4).trim();
          extractedLength = jsContent.length;
          extractedLast500 = jsContent.slice(-500);
        }
      }
    }

    // Check worker routes
    const routesResp = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/workers/routes`,
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
    const routesData = await routesResp.json();

    // Check redirect rules
    const redirectResp = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/rulesets/phases/http_request_dynamic_redirect/entrypoint`,
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
    const redirectData = await redirectResp.json();

    return jsonOk({
      rawAnalysis: {
        contentType,
        rawLength,
        rawHasExportDefault,
        rawHasFetch,
        rawHasShare,
        rawHasServeOg,
        rawHasServe404,
        rawHasFetchOrigin,
      },
      extracted: {
        length: extractedLength,
        last500: extractedLast500,
      },
      routes: routesData.result,
      redirectRules: redirectData.result?.rules?.map((r: any) => ({
        description: r.description,
        expression: r.expression,
        enabled: r.enabled,
      })),
    });
  } catch (e) {
    return internalError(e);
  }
});
