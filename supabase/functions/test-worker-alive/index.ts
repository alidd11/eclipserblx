import { handleCors, jsonOk, internalError } from "../_shared/edge-response.ts";

/**
 * READ-ONLY diagnostics for the Cloudflare Worker.
 * Does NOT deploy or mutate any production resources.
 */
Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const ts = Date.now();

    // Probe custom domain for key assets
    const probes = [
      { name: "sw.js", url: `https://eclipserblx.com/sw.js?cb=${ts}` },
      { name: "custom-sw.js", url: `https://eclipserblx.com/custom-sw.js?cb=${ts}` },
      { name: "offline.html", url: `https://eclipserblx.com/offline.html?cb=${ts}` },
      { name: "manifest", url: `https://eclipserblx.com/manifest.webmanifest?cb=${ts}` },
      { name: "homepage", url: `https://eclipserblx.com/?cb=${ts}` },
    ];

    const results: Record<string, unknown> = {};

    await Promise.all(probes.map(async (probe) => {
      try {
        const resp = await fetch(probe.url, {
          headers: { "User-Agent": "Eclipse-HealthCheck/1.0" },
          redirect: "manual",
        });
        const headers: Record<string, string> = {};
        resp.headers.forEach((v, k) => { headers[k] = v; });
        const body = await resp.text();

        results[probe.name] = {
          status: resp.status,
          xEclipseWorker: headers["x-eclipse-worker"] || null,
          cacheStatus: headers["cf-cache-status"] || null,
          cacheControl: headers["cache-control"] || null,
          server: headers["server"] || null,
          contentLength: body.length,
          // For sw.js, extract the cacheId to verify version
          ...(probe.name === "sw.js" && {
            containsV5: body.includes("eclipse-v5"),
            containsV6: body.includes("eclipse-v6"),
            containsIndexHtml: body.includes("index.html"),
          }),
          ...(probe.name === "custom-sw.js" && {
            swVersion: body.match(/SW_VERSION\s*=\s*'([^']+)'/)?.[1] || null,
          }),
        };
      } catch (e) {
        results[probe.name] = { error: (e as Error).message };
      }
    }));

    // Also probe the origin for comparison
    const originResp = await fetch(`https://roleplay-hub-shop.lovable.app/sw.js?cb=${ts}`, {
      headers: { "User-Agent": "Eclipse-HealthCheck/1.0" },
      redirect: "manual",
    });
    const originBody = await originResp.text();
    results["origin_sw"] = {
      status: originResp.status,
      containsV5: originBody.includes("eclipse-v5"),
      containsV6: originBody.includes("eclipse-v6"),
      contentLength: originBody.length,
    };

    return jsonOk({
      timestamp: new Date().toISOString(),
      diagnostics: results,
      note: "Read-only diagnostics. No production resources were modified.",
    });
  } catch (e) {
    return internalError(e);
  }
});
