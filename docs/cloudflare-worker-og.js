/**
 * Cloudflare Worker: Discord/Social Bot OG Proxy
 * 
 * Detects bot crawlers (Discord, Twitter, Facebook, etc.) requesting product pages
 * and proxies them to the product-og edge function for rich previews.
 * Human visitors get the normal SPA.
 * 
 * Deploy this as a Cloudflare Worker on your domain.
 */

const SUPABASE_FUNCTION_URL = "https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/product-og";

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

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const userAgent = request.headers.get("User-Agent") || "";

    // Only intercept /products/<slug> paths
    const productMatch = url.pathname.match(/^\/products\/([^/?#]+)/);
    if (!productMatch) {
      // Not a product page — pass through to origin (your Lovable app)
      return fetch(request);
    }

    // Check if the request is from a bot/crawler
    const isBot = BOT_PATTERNS.some((bot) =>
      userAgent.toLowerCase().includes(bot.toLowerCase())
    );

    if (!isBot) {
      // Human visitor — serve the normal SPA
      return fetch(request);
    }

    // Bot detected — proxy to the product-og edge function
    const slug = decodeURIComponent(productMatch[1]);
    const ogUrl = `${SUPABASE_FUNCTION_URL}?slug=${encodeURIComponent(slug)}`;

    try {
      const ogResponse = await fetch(ogUrl, {
        headers: {
          "User-Agent": userAgent,
        },
      });

      // Return the OG HTML to the bot
      return new Response(ogResponse.body, {
        status: ogResponse.status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    } catch (error) {
      // If edge function fails, fall back to normal page
      return fetch(request);
    }
  },
};
