const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WORKER_SCRIPT = `
const SUPABASE_FUNCTION_URL = "https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/og-proxy";

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

    // /share/ prefix — ALWAYS proxy to og-proxy (guaranteed OG tags for any client)
    if (url.pathname.startsWith("/share/")) {
      const realPath = url.pathname.replace(/^\\/share/, "");
      const ogUrl = SUPABASE_FUNCTION_URL + "?path=" + encodeURIComponent(realPath);
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
        // Fallback: redirect to the real page
        return Response.redirect(url.origin + realPath, 302);
      }
    }

    const isDynamicPage = /^\\/(products|store)\\/[^/?#]+/.test(url.pathname);
    const isStaticOgPage = STATIC_OG_PATHS.has(url.pathname);

    // If not an OG-relevant page, pass through immediately
    if (!isDynamicPage && !isStaticOgPage) {
      return fetch(request);
    }

    // Exclude performance testing tools
    const isTestingTool = NOT_BOT_PATTERNS.some((p) =>
      userAgent.toLowerCase().includes(p.toLowerCase())
    );
    if (isTestingTool) return fetch(request);

    // Only intercept bots — everyone else passes through
    const isBot = BOT_PATTERNS.some((bot) =>
      userAgent.toLowerCase().includes(bot.toLowerCase())
    );
    if (!isBot) return fetch(request);

    // Bot detected — serve OG HTML from edge function
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
      // If OG proxy fails, let the bot see the normal page
      return fetch(request);
    }
  },
};
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

    // Step 1: Get account ID from zone
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

    // Step 2: Upload worker script
    const workerName = "eclipse-og-proxy";
    const metadata = JSON.stringify({
      main_module: "worker.js",
      compatibility_date: "2024-01-01",
    });

    const boundary = "----FormBoundary" + Math.random().toString(36).slice(2);
    const body = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="metadata"; filename="metadata.json"`,
      `Content-Type: application/json`,
      ``,
      metadata,
      `--${boundary}`,
      `Content-Disposition: form-data; name="worker.js"; filename="worker.js"`,
      `Content-Type: application/javascript+module`,
      ``,
      WORKER_SCRIPT,
      `--${boundary}--`,
    ].join("\r\n");

    const uploadRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${cfApiToken}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body,
      }
    );
    const uploadData = await uploadRes.json();
    if (!uploadData.success) {
      return new Response(
        JSON.stringify({ error: "Failed to upload worker", details: uploadData.errors }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Ensure route exists
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
        message: "Worker deployed — human traffic passes through, only bots intercepted",
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
