/**
 * Cloudflare Worker: Discord/Social Bot OG Proxy
 * 
 * Detects bot crawlers (Discord, Twitter, Facebook, etc.) requesting product pages
 * and proxies them to the product-og edge function for rich previews.
 * Human visitors get the normal SPA.
 * 
 * Deploy this as a Cloudflare Worker on your domain.
 */

const SUPABASE_FUNCTION_URL = "https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/og-proxy2";

// Bot user-agent patterns
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
      return fetch(request);
    }

    // Check if the request is from a bot/crawler
    const isBot = BOT_PATTERNS.some((bot) =>
      userAgent.toLowerCase().includes(bot.toLowerCase())
    );

    if (!isBot) {
      return fetch(request);
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
      return fetch(request);
    }
  },
};
