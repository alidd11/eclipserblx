import { handleCors, jsonOk, internalError } from "../_shared/edge-response.ts";

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const CF_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const CF_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    if (!CF_TOKEN || !CF_ACCOUNT_ID) {
      return jsonOk({ error: "Missing CF secrets" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "read";
    const workerName = "eclipse-og-proxy";

    const headers = {
      Authorization: `Bearer ${CF_TOKEN}`,
    };

    if (action === "read") {
      // Read current worker script
      const resp = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/workers/scripts/${workerName}`,
        { headers }
      );
      const text = await resp.text();
      return jsonOk({ status: resp.status, script: text.substring(0, 5000) });
    }

    if (action === "update") {
      // Updated Worker script that properly preserves Content-Type headers
      const workerScript = `
export default {
  async fetch(request, env) {
    var url = new URL(request.url);
    var hostname = url.hostname;

    // Only intercept *.eclipserblx.com subdomains (not the main domain)
    var isSubdomain = hostname.endsWith('.eclipserblx.com') && hostname !== 'eclipserblx.com' && hostname !== 'www.eclipserblx.com';

    if (!isSubdomain) {
      // For the main domain, handle OG bot detection as before
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

    // For subdomains: proxy to origin, preserving all headers
    return fetchOrigin(request, url);
  }
}

async function fetchOrigin(request, url) {
  var originHost = 'roleplay-hub-shop.lovable.app';
  var originUrl = 'https://' + originHost + url.pathname + url.search;
  
  // Clone headers but override Host
  var newHeaders = new Headers(request.headers);
  newHeaders.set('Host', originHost);
  newHeaders.set('X-Forwarded-Host', url.hostname);
  
  var originResp = await fetch(originUrl, {
    method: request.method,
    headers: newHeaders,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    redirect: 'follow'
  });

  // Create new response preserving ALL original headers (including Content-Type)
  var respHeaders = new Headers(originResp.headers);
  // Remove headers that shouldn't be forwarded
  respHeaders.delete('transfer-encoding');
  
  return new Response(originResp.body, {
    status: originResp.status,
    statusText: originResp.statusText,
    headers: respHeaders
  });
}
`;

      // Upload as ES module using multipart form data
      const formData = new FormData();
      
      const metadata = JSON.stringify({
        main_module: "worker.mjs",
        compatibility_date: "2024-01-01",
      });
      
      formData.append("metadata", new Blob([metadata], { type: "application/json" }));
      formData.append("worker.mjs", new Blob([workerScript], { type: "application/javascript+module" }), "worker.mjs");
      
      const resp = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/workers/scripts/${workerName}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${CF_TOKEN}` },
          body: formData,
        }
      );
      const result = await resp.json();
      return jsonOk({ status: resp.status, success: result.success, errors: result.errors });
    }

    return jsonOk({ error: "Unknown action. Use 'read' or 'update'" }, 400);
  } catch (e) {
    return internalError(e);
  }
});
