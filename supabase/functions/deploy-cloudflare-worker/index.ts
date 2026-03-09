const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WORKER_SCRIPT = `
const SUPABASE_FUNCTION_URL = "https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/og-proxy";
const ORIGIN_URL = "https://roleplay-hub-shop.lovable.app";

const BOT_PATTERNS = [
  "Discordbot", "Twitterbot", "facebookexternalhit", "LinkedInBot",
  "Slackbot", "TelegramBot", "WhatsApp", "Googlebot", "bingbot",
  "Applebot", "Embedly", "Iframely", "vkShare", "Pinterestbot",
];

const NOT_BOT_PATTERNS = [
  "Lighthouse", "PageSpeed", "PTST", "Chrome-Lighthouse", "Speed Insights",
];

const STATIC_OG_PATHS = new Set([
  '/', '/products', '/stores', '/categories', '/featured',
  '/eclipse-plus', '/faq', '/help-center', '/sell', '/contact',
  '/affiliate', '/advertise', '/jobs',
]);

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const userAgent = request.headers.get("User-Agent") || "";

    const isDynamicPage = /^\\/(products|store)\\/[^/?#]+/.test(url.pathname);
    const isStaticOgPage = STATIC_OG_PATHS.has(url.pathname);

    if (!isDynamicPage && !isStaticOgPage) {
      return proxyToOrigin(request, url);
    }

    const isTestingTool = NOT_BOT_PATTERNS.some((pattern) =>
      userAgent.toLowerCase().includes(pattern.toLowerCase())
    );
    if (isTestingTool) return proxyToOrigin(request, url);

    const isBot = BOT_PATTERNS.some((bot) =>
      userAgent.toLowerCase().includes(bot.toLowerCase())
    );
    if (!isBot) return proxyToOrigin(request, url);

    const ogUrl = SUPABASE_FUNCTION_URL + "?path=" + encodeURIComponent(url.pathname);
    try {
      const ogResponse = await fetch(ogUrl, {
        headers: { "User-Agent": userAgent },
      });
      return new Response(ogResponse.body, {
        status: ogResponse.status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    } catch (error) {
      return proxyToOrigin(request, url);
    }
  },
};

async function proxyToOrigin(request, url) {
  const originUrl = new URL(url.pathname + url.search, ORIGIN_URL);
  const newHeaders = new Headers(request.headers);
  newHeaders.delete("Host");
  newHeaders.delete("host");

  const isGetLike = request.method === "GET" || request.method === "HEAD";
  const newRequest = new Request(originUrl.toString(), {
    method: request.method,
    headers: newHeaders,
    body: !isGetLike ? request.body : undefined,
    redirect: "manual",
  });

  const res = await fetch(newRequest);

  if ([301, 302, 303, 307, 308].includes(res.status)) {
    const location = res.headers.get("Location") || "";
    const isAuthBridge = location.includes("auth-bridge") ||
      location.includes("lovableproject.com") ||
      (location.includes("lovable.app") && !location.includes(ORIGIN_URL));

    if (isAuthBridge) {
      const spaRes = await fetch(ORIGIN_URL + "/index.html", {
        headers: { "Accept": "text/html" },
      });
      return new Response(spaRes.body, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache",
          "X-OG-Worker": "auth-bridge-bypass",
        },
      });
    }

    let rewrittenLocation = location;
    if (location.startsWith(ORIGIN_URL)) {
      rewrittenLocation = location.replace(ORIGIN_URL, url.origin);
    }
    return new Response(null, {
      status: res.status,
      headers: { "Location": rewrittenLocation, "X-OG-Worker": "redirect" },
    });
  }

  const responseHeaders = new Headers(res.headers);
  const ct = responseHeaders.get("Content-Type") || "";
  const isPage = !url.pathname.includes(".") || url.pathname.endsWith(".html");
  if (isPage && !ct.includes("text/html")) {
    responseHeaders.set("Content-Type", "text/html; charset=utf-8");
  }
  responseHeaders.delete("Content-Disposition");
  responseHeaders.delete("Location");

  return new Response(res.body, { status: res.status, headers: responseHeaders });
}
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cfApiToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID");

    if (!cfApiToken || !cfZoneId) {
      return new Response(
        JSON.stringify({ error: "Missing Cloudflare credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Get the account ID from the zone
    const zoneRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}`, {
      headers: { Authorization: `Bearer ${cfApiToken}`, "Content-Type": "application/json" },
    });
    const zoneData = await zoneRes.json();
    if (!zoneData.success) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch zone info", details: zoneData.errors }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const accountId = zoneData.result.account.id;

    // Step 2: Upload/update the worker script
    const workerName = "eclipse-og-proxy";
    const uploadRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${cfApiToken}`,
          "Content-Type": "application/javascript",
        },
        body: WORKER_SCRIPT,
      }
    );
    const uploadData = await uploadRes.json();
    if (!uploadData.success) {
      return new Response(
        JSON.stringify({ error: "Failed to upload worker", details: uploadData.errors }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Create/update the worker route to match all traffic on the domain
    // First list existing routes to avoid duplicates
    const routesRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/workers/routes`,
      { headers: { Authorization: `Bearer ${cfApiToken}`, "Content-Type": "application/json" } }
    );
    const routesData = await routesRes.json();
    
    const desiredPattern = "eclipserblx.com/*";
    const existingRoute = routesData.result?.find(
      (r: any) => r.pattern === desiredPattern || r.pattern === "*.eclipserblx.com/*"
    );

    let routeResult;
    if (existingRoute) {
      // Update existing route
      const updateRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/workers/routes/${existingRoute.id}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${cfApiToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ pattern: desiredPattern, script: workerName }),
        }
      );
      routeResult = await updateRes.json();
    } else {
      // Create new route
      const createRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/workers/routes`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${cfApiToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ pattern: desiredPattern, script: workerName }),
        }
      );
      routeResult = await createRes.json();
    }

    return new Response(
      JSON.stringify({
        success: true,
        worker: workerName,
        route: desiredPattern,
        upload: uploadData.success,
        routeUpdate: routeResult.success,
        message: "Cloudflare Worker deployed and route configured successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Deployment failed", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
