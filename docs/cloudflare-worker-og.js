/**
 * Cloudflare Worker: Discord/Social Bot OG Proxy
 * 
 * ARCHITECTURE: This worker ONLY intercepts bot/crawler requests to serve
 * rich OG meta tags. Human traffic passes through untouched via fetch(request).
 * 
 * This eliminates white screen issues caused by manual proxying, auth-bridge
 * redirect loops, and Content-Type mismatches.
 * 
 * Deploy via the deploy-cloudflare-worker edge function.
 */

const SUPABASE_FUNCTION_URL = "https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/og-proxy";

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
  "PTST",
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

    // Check if this is a page that needs OG tags
    const isDynamicPage = /^\/(products|store)\/[^/?#]+/.test(url.pathname);
    const isStaticOgPage = STATIC_OG_PATHS.has(url.pathname);

    // Not an OG-relevant page — pass through immediately
    if (!isDynamicPage && !isStaticOgPage) {
      return fetch(request);
    }

    // Exclude performance testing tools
    const isTestingTool = NOT_BOT_PATTERNS.some((pattern) =>
      userAgent.toLowerCase().includes(pattern.toLowerCase())
    );
    if (isTestingTool) return fetch(request);

    // Only intercept bots — everyone else passes through
    const isBot = BOT_PATTERNS.some((bot) =>
      userAgent.toLowerCase().includes(bot.toLowerCase())
    );
    if (!isBot) return fetch(request);

    // Bot detected — serve OG HTML from edge function
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
      // If OG proxy fails, let the bot see the normal page
      return fetch(request);
    }
  },
};
