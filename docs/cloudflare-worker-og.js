/**
 * Cloudflare Worker: Discord/Social Bot OG Proxy
 * 
 * Detects bot crawlers (Discord, Twitter, Facebook, etc.) requesting product pages
 * and proxies them to the product-og edge function for rich previews.
 * Human visitors get the normal SPA.
 * 
 * Deploy this as a Cloudflare Worker on your domain.
 */

const SUPABASE_FUNCTION_URL = "https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/og-proxy";

// The actual Lovable origin to proxy human traffic to
const ORIGIN_URL = "https://roleplay-hub-shop.lovable.app";

// Bot user-agent patterns (social crawlers & search engines only)
const BOT_PATTERNS = [
  "Discordbot",
  "Twitterbot",
  "facebookexternalhit",
  "LinkedInBot",
  "Slackbot",
  "TelegramBot",
  "WhatsApp",
  "Googlebot",
  "bingbot",
  "Applebot",
  "Embedly",
  "Iframely",
  "vkShare",
  "Pinterestbot",
];

// Patterns that should NOT be treated as bots (performance testing tools)
const NOT_BOT_PATTERNS = [
  "Lighthouse",
  "PageSpeed",
  "PTST",        // PageSpeed Testing
  "Chrome-Lighthouse",
  "Speed Insights",
];

// Static pages that should also get OG tags for bots
const STATIC_OG_PATHS = new Set([
  '/', '/products', '/stores', '/categories', '/featured',
  '/eclipse-plus', '/faq', '/help-center', '/sell', '/contact',
  '/affiliate', '/advertise', '/jobs',
]);

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const userAgent = request.headers.get("User-Agent") || "";

    // Check if this is a dynamic page or a known static page
    const isDynamicPage = /^\/(products|store)\/[^/?#]+/.test(url.pathname);
    const isStaticOgPage = STATIC_OG_PATHS.has(url.pathname);

    if (!isDynamicPage && !isStaticOgPage) {
      return proxyToOrigin(request, url);
    }

    // Exclude performance testing tools from bot detection
    const isTestingTool = NOT_BOT_PATTERNS.some((pattern) =>
      userAgent.toLowerCase().includes(pattern.toLowerCase())
    );

    if (isTestingTool) {
      return proxyToOrigin(request, url);
    }

    // Check if the request is from a bot/crawler
    const isBot = BOT_PATTERNS.some((bot) =>
      userAgent.toLowerCase().includes(bot.toLowerCase())
    );

    if (!isBot) {
      return proxyToOrigin(request, url);
    }

    // Bot detected — proxy to the og-proxy edge function
    const ogUrl = `${SUPABASE_FUNCTION_URL}?path=${encodeURIComponent(url.pathname)}`;

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

/**
 * Proxy the request to the actual Lovable origin.
 * Uses redirect: "manual" to intercept auth-bridge redirects and prevent loops.
 */
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

  // Handle redirects manually to prevent loops
  if ([301, 302, 303, 307, 308].includes(res.status)) {
    const location = res.headers.get("Location") || "";

    // Block auth-bridge and lovable internal redirects
    const isAuthBridge = location.includes("auth-bridge") ||
      location.includes("lovableproject.com") ||
      (location.includes("lovable.app") && !location.includes(ORIGIN_URL));

    if (isAuthBridge) {
      // Serve the SPA index.html directly
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

    // For other redirects, rewrite Location from origin to custom domain
    let rewrittenLocation = location;
    if (location.startsWith(ORIGIN_URL)) {
      rewrittenLocation = location.replace(ORIGIN_URL, url.origin);
    }

    return new Response(null, {
      status: res.status,
      headers: {
        "Location": rewrittenLocation,
        "X-OG-Worker": "redirect",
      },
    });
  }

  const responseHeaders = new Headers(res.headers);

  // Ensure HTML pages have correct Content-Type (prevents Safari download issue)
  const ct = responseHeaders.get("Content-Type") || "";
  const isPage = !url.pathname.includes(".") || url.pathname.endsWith(".html");
  if (isPage && !ct.includes("text/html")) {
    responseHeaders.set("Content-Type", "text/html; charset=utf-8");
  }

  // Remove headers that could trigger download prompts
  responseHeaders.delete("Content-Disposition");
  responseHeaders.delete("Location");

  return new Response(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}
