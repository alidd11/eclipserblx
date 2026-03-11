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

    // First get account ID from zone
    const zoneResp = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}`, { headers });
    const zoneData = await zoneResp.json();
    const accountId = zoneData?.result?.account?.id;
    if (!accountId) {
      return jsonOk({ error: "Could not get account ID from zone", zoneData }, 500);
    }

    const workerName = "eclipse-og-proxy";

    if (action === "read") {
      const resp = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`,
        { headers: { Authorization: `Bearer ${CF_TOKEN}` } }
      );
      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("multipart") || contentType.includes("javascript")) {
        const text = await resp.text();
        return jsonOk({ status: resp.status, content_type: contentType, script: text.substring(0, 8000) });
      }
      const data = await resp.json().catch(() => null);
      return jsonOk({ status: resp.status, content_type: contentType, data });
    }

    if (action === "update") {
      const workerScript = `
export default {
  async fetch(request, env) {
    var url = new URL(request.url);
    var hostname = url.hostname;

    var isSubdomain = hostname.endsWith('.eclipserblx.com') && hostname !== 'eclipserblx.com' && hostname !== 'www.eclipserblx.com';

    if (!isSubdomain) {
      var ua = (request.headers.get('user-agent') || '').toLowerCase();
      var bots = ['twitterbot', 'facebookexternalhit', 'linkedinbot', 'discordbot', 'slackbot', 'telegrambot', 'whatsapp', 'googlebot', 'bingbot'];
      var isBot = bots.some(function(b) { return ua.indexOf(b) !== -1; });

      if (isBot && url.pathname.startsWith('/products/')) {
        var slug = url.pathname.replace('/products/', '').split('?')[0].split('#')[0];
        var ogUrl = 'https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/og-proxy?slug=' + encodeURIComponent(slug);
        var ogResp = await fetch(ogUrl);
        var ogBody = await ogResp.text();
        return new Response(ogBody, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' }
        });
      }
      return fetch(request);
    }

    // For subdomains: proxy to origin preserving all headers including Content-Type
    return fetchOrigin(request, url);
  }
}

async function fetchOrigin(request, url) {
  var originHost = 'roleplay-hub-shop.lovable.app';
  var originUrl = 'https://' + originHost + url.pathname + url.search;
  
  var newHeaders = new Headers(request.headers);
  newHeaders.set('Host', originHost);
  newHeaders.set('X-Forwarded-Host', url.hostname);
  
  var originResp = await fetch(originUrl, {
    method: request.method,
    headers: newHeaders,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    redirect: 'follow'
  });

  // Clone response preserving ALL headers (especially Content-Type for JS/CSS files)
  var respHeaders = new Headers(originResp.headers);
  respHeaders.delete('transfer-encoding');
  
  return new Response(originResp.body, {
    status: originResp.status,
    statusText: originResp.statusText,
    headers: respHeaders
  });
}
`;

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
