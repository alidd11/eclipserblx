/**
 * Cloudflare Worker: Discord/Social Bot OG Proxy
 * 
 * ARCHITECTURE: This worker ONLY intercepts bot/crawler requests to serve
 * rich OG meta tags. Human traffic passes through untouched via fetch(request).
 * 
 * Supports:
 * - Main site (eclipserblx.com / www.eclipserblx.com)
 * - Store subdomains (*.eclipserblx.com)
 * - Store custom domains (mystore.com) via Cloudflare for SaaS
 * 
 * Deploy via the deploy-cloudflare-worker edge function.
 * 
 * COMPANION RULES (also deployed by the edge function):
 * 
 * 1. WAF Custom Rule (phase: http_request_firewall_custom)
 *    - Skips Bot Fight Mode for social media crawler User-Agents
 *    - Expression: (http.user_agent contains "Discordbot") or ...
 *    - Action: skip (bypasses SBFM, BIC, rate limiting, etc.)
 *    - This ensures the Worker actually receives bot requests
 * 
 * 2. Redirect Rule (phase: http_request_dynamic_redirect)
 *    - Redirects /share/* to og-proxy edge function directly
 *    - Works independently of the Worker (bulletproof fallback)
 *    - Expression: starts_with(http.request.uri.path, "/share/")
 *    - Target: supabase.co/functions/v1/og-proxy?path=<rest-of-path>
 */

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

const MAIN_DOMAINS = ['eclipserblx.com', 'www.eclipserblx.com'];
const RESERVED_SUBS = ['guard', 'www', 'api', 'admin', 'mail', 'stores'];

function isStoreHostname(hostname) {
  if (MAIN_DOMAINS.includes(hostname)) return false;
  if (hostname.endsWith('.eclipserblx.com')) {
    const sub = hostname.replace('.eclipserblx.com', '');
    return !RESERVED_SUBS.includes(sub);
  }
  if (hostname.endsWith('.lovable.app') || hostname.endsWith('.lovableproject.com')) return false;
  return true;
}

async function serveOg(path, userAgent, hostname) {
  let ogUrl = `${SUPABASE_FUNCTION_URL}?path=${encodeURIComponent(path)}`;
  if (hostname) ogUrl += `&hostname=${encodeURIComponent(hostname)}`;
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
}

const DEAD_PREFIXES = [
  "/forum/", "/blog/", "/wp-admin/", "/wp-content/",
  "/wp-includes/", "/wp-login.php", "/xmlrpc.php",
];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const userAgent = request.headers.get("User-Agent") || "";

    // --- Return 410 Gone for known dead paths (speeds up Google deindexing) ---
    if (DEAD_PREFIXES.some((p) => url.pathname.startsWith(p) || url.pathname === p.replace(/\/$/, ""))) {
      return new Response("410 Gone", { status: 410, headers: { "Content-Type": "text/plain", "X-Robots-Tag": "noindex" } });
    }
    const hostname = url.hostname;

    // --- Store subdomain / custom domain ---
    if (isStoreHostname(hostname)) {
      const isTestingTool = NOT_BOT_PATTERNS.some((p) =>
        userAgent.toLowerCase().includes(p.toLowerCase())
      );
      if (isTestingTool) return fetch(request);

      const isBot = BOT_PATTERNS.some((bot) =>
        userAgent.toLowerCase().includes(bot.toLowerCase())
      );
      if (!isBot) return fetch(request);

      try {
        return await serveOg(url.pathname, userAgent, hostname);
      } catch (e) {
        return fetch(request);
      }
    }

    // --- /share/ prefix — ALWAYS proxy (guaranteed OG tags) ---
    if (url.pathname.startsWith("/share/")) {
      const realPath = url.pathname.replace(/^\/share/, "");
      try {
        return await serveOg(realPath, userAgent, null);
      } catch (error) {
        return Response.redirect(url.origin + realPath, 302);
      }
    }

    const isDynamicPage = /^\/(products|store)\/[^/?#]+/.test(url.pathname);
    const isStaticOgPage = STATIC_OG_PATHS.has(url.pathname);

    if (!isDynamicPage && !isStaticOgPage) return fetch(request);

    const isTestingTool = NOT_BOT_PATTERNS.some((p) =>
      userAgent.toLowerCase().includes(p.toLowerCase())
    );
    if (isTestingTool) return fetch(request);

    const isBot = BOT_PATTERNS.some((bot) =>
      userAgent.toLowerCase().includes(bot.toLowerCase())
    );
    if (!isBot) return fetch(request);

    try {
      return await serveOg(url.pathname, userAgent, null);
    } catch (error) {
      return fetch(request);
    }
  },
};
