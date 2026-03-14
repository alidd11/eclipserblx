// Using Deno.serve (modern API)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExternalProduct {
  name: string;
  description: string;
  price: number;
  images: string[];
  sourceUrl: string;
  platform: string;
  sellerName?: string;
  suggestedCategoryId?: string;
  alreadyImported?: boolean;
}

interface ScrapeResult {
  success: boolean;
  products: ExternalProduct[];
  sellerName?: string;
  sellerDiscord?: string;
  error?: string;
}

// Blocked competitor marketplace domains
const BLOCKED_DOMAINS = [
  'clearlydev.com',
  'builtbybit.com',
  'scriptblox.com',
  'v3rmillion.net',
  'robloxscripts.com',
  'payhip.com',
];
const blockedDomainPattern = new RegExp(
  BLOCKED_DOMAINS.map(d => d.replace(/\./g, '\\.')).join('|'),
  'i'
);

/** Strip plain-text URLs pointing to blocked domains from a description string */
function stripBlockedUrls(text: string): string {
  if (!text) return '';
  return text.replace(/https?:\/\/[^\s<>"']*(?:clearlydev\.com|builtbybit\.com|scriptblox\.com|v3rmillion\.net|robloxscripts\.com|payhip\.com)[^\s<>"']*/gi, '').trim();
}

// Category keyword mapping for auto-matching
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'discord-bots': ['bot', 'discord bot', 'moderation', 'music bot', 'utility bot'],
  'scripts': ['script', 'lua', 'roblox script', 'executor', 'admin script'],
  'plugins': ['plugin', 'spigot', 'bukkit', 'paper', 'minecraft plugin'],
  'game-assets': ['asset', 'model', '3d', 'texture', 'ui kit', 'game asset'],
  'websites': ['website', 'web', 'landing page', 'dashboard', 'portfolio'],
  'graphics': ['logo', 'banner', 'thumbnail', 'graphic', 'design'],
};

function suggestCategory(name: string, description: string): string | undefined {
  const text = `${name} ${description}`.toLowerCase();
  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return slug;
    }
  }
  return undefined;
}

// Allowed URL patterns for scraping (prevent SSRF)
const ALLOWED_SCRAPE_DOMAINS = ['clearlydev.com', 'builtbybit.com', 'payhip.com'];

function isAllowedScrapeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_SCRAPE_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

// ─── Image filtering helpers ───────────────────────────────────────────────────

// Patterns that indicate a branding / UI image rather than a product image
const SKIP_IMAGE_PATH = /\/(avatar|profile|favicon|icon|brand|site-logo|navbar|footer|header|sprite|placeholder)\b/i;
const SKIP_IMAGE_DOMAIN = /\b(rbxcdn\.com|roblox\.com|tr\.rbxcdn\.com|thumbs\.roblox\.com|googletagmanager\.com|google-analytics\.com|facebook\.com|twitter\.com)\b/i;
const SKIP_ALT_TEXT = /\b(clearlydev|clearly\s*dev|store\s*logo|seller\s*avatar|platform|marketplace|builtbybit|built\s*by\s*bit|navbar|footer|header)\b/i;
const SKIP_TINY_DATA_URI = /^data:image\/[^;]+;base64,.{0,700}$/;
const SKIP_SITE_WIDE = /\.(svg|ico)(\?|$)/i;

// ClearlyDev uses Next.js — product images are served via /_next/image?url=<encoded>&w=&q=
// We must NOT block /_next/image (that's where the actual product images live)
// We only block /_next/static (JS/CSS bundles)
const SKIP_CLEARLYDEV_STATIC = /clearlydev\.com\/_next\/static/i;

/**
 * Resolve a Next.js /_next/image proxy URL to the underlying image URL.
 * e.g. /_next/image?url=https%3A%2F%2Fcdn.clearlydev.com%2Fimage.png&w=1200&q=75
 *   → https://cdn.clearlydev.com/image.png
 */
function resolveNextImageUrl(imgUrl: string): string {
  try {
    const parsed = new URL(imgUrl);
    if (parsed.pathname === '/_next/image' && parsed.searchParams.has('url')) {
      const inner = parsed.searchParams.get('url')!;
      // The inner URL may be absolute or relative
      if (inner.startsWith('http')) return inner;
      // Relative — prepend origin
      return `${parsed.origin}${inner.startsWith('/') ? '' : '/'}${inner}`;
    }
  } catch { /* not a valid URL, return as-is */ }
  return imgUrl;
}

function isProductImage(imgUrl: string, imgAlt: string): boolean {
  if (!imgUrl || imgUrl.length < 10) return false;
  if (SKIP_TINY_DATA_URI.test(imgUrl)) return false;
  if (SKIP_IMAGE_PATH.test(imgUrl)) return false;
  if (SKIP_IMAGE_DOMAIN.test(imgUrl)) return false;
  if (SKIP_ALT_TEXT.test(imgAlt)) return false;
  if (SKIP_CLEARLYDEV_STATIC.test(imgUrl)) return false;
  if (SKIP_SITE_WIDE.test(imgUrl)) return false;
  // Must be http(s) or a Next.js image proxy path
  if (!imgUrl.startsWith('http://') && !imgUrl.startsWith('https://') && !imgUrl.startsWith('/_next/image')) return false;
  return true;
}

// ─── Store page parsers ────────────────────────────────────────────────────────

function parseClearlyDevStore(markdown: string, storeUrl: string, links?: string[]): { products: ExternalProduct[]; sellerName?: string } {
  const products: ExternalProduct[] = [];
  const seenUrls = new Set<string>();

  // Extract seller name from store URL slug or markdown heading
  let sellerName: string | undefined;
  const storeSlugMatch = storeUrl.match(/\/store\/([^\/\?#]+)/);
  if (storeSlugMatch) {
    sellerName = storeSlugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
  }
  const headingMatch = markdown.match(/^#{1,2}\s+(.+?)(?:\s*(?:Store|Shop|Products))?$/m);
  if (headingMatch && headingMatch[1].length >= 2 && headingMatch[1].length <= 40) {
    sellerName = headingMatch[1].trim();
  }
  
  const productLinkRegex = /\[([^\]]+)\]\((https:\/\/clearlydev\.com\/product\/[^\)]+)\)/g;
  
  let match;
  while ((match = productLinkRegex.exec(markdown)) !== null) {
    const name = match[1].trim();
    const url = match[2];
    
    if (seenUrls.has(url) || name.length < 3 || name.includes('Back')) continue;
    seenUrls.add(url);
    
    const categorySlug = suggestCategory(name, '');
    
    products.push({
      name,
      description: '',
      price: 0,
      images: [],
      sourceUrl: url,
      platform: 'clearlydev',
      suggestedCategoryId: categorySlug,
    });
  }
  
  if (products.length === 0 && links && links.length > 0) {
    for (const link of links) {
      if (!link.includes('clearlydev.com/product/')) continue;
      if (seenUrls.has(link)) continue;
      seenUrls.add(link);
      
      const slugMatch = link.match(/\/product\/([^\/\?#]+)/);
      const slug = slugMatch ? slugMatch[1] : '';
      const name = slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim();
      
      if (!name || name.length < 3) continue;
      
      const categorySlug = suggestCategory(name, '');
      
      products.push({
        name,
        description: '',
        price: 0,
        images: [],
        sourceUrl: link.split('?')[0],
        platform: 'clearlydev',
        suggestedCategoryId: categorySlug,
      });
    }
  }
  
  return { products, sellerName };
}

/** Extract the rich HTML description block from a ClearlyDev product page */
function extractHtmlDescription(html: string): string {
  if (!html) return '';

  const descPatterns = [
    /(?:<h[23][^>]*>.*?Description.*?<\/h[23]>)([\s\S]*?)(?=<h[23]|<footer|<div[^>]*class="[^"]*(?:refund|review|related|license))/i,
    /<(?:div|section)[^>]*(?:class|id)="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section)>/i,
  ];

  for (const pattern of descPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let content = match[1].trim();
      
      content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
      content = content.replace(/<style[\s\S]*?<\/style>/gi, '');
      content = content.replace(/<img[^>]*>/gi, '');
      content = content.replace(/<\/?div[^>]*>/gi, '');
      content = content.replace(/<\/?section[^>]*>/gi, '');
      content = content.replace(/<\/?span[^>]*>/gi, '');
      
      const allowedTagNames = /^<\/?(?:p|br|strong|b|em|i|u|h2|h3|h4|ul|ol|li|hr|a)(?:\s|>|\/)/i;
      const tagPattern = /<\/?[a-z][a-z0-9]*(?:\s[^>]*)?>/gi;
      content = content.replace(tagPattern, (tag) => {
        return allowedTagNames.test(tag) ? tag : '';
      });
      
      content = content.replace(/\n{3,}/g, '\n\n').trim();
      
      if (content.length > 20) {
        return content.slice(0, 5000);
      }
    }
  }
  return '';
}

// ─── Price parsing ─────────────────────────────────────────────────────────────

/** Extract price from markdown, supporting $, £, and "Free" */
function extractPrice(markdown: string): number {
  // Check for explicit "Free" badge
  if (/\bfree\b/i.test(markdown.substring(0, 500))) {
    // Only treat as free if there's no price nearby
    const priceNearby = /[\$£]\d+/.test(markdown.substring(0, 500));
    if (!priceNearby) return 0;
  }

  // Try GBP first (£)
  const gbpMatch = markdown.match(/£(\d+(?:\.\d{1,2})?)/);
  if (gbpMatch) return parseFloat(gbpMatch[1]);

  // Then USD ($) — convert to GBP estimate (0.79 rate)
  const usdMatch = markdown.match(/\$(\d+(?:\.\d{1,2})?)/);
  if (usdMatch) {
    const usd = parseFloat(usdMatch[1]);
    return Math.round(usd * 0.79 * 100) / 100;
  }

  // Try plain number after "Price" label
  const labelMatch = markdown.match(/price[:\s]+(\d+(?:\.\d{1,2})?)/i);
  if (labelMatch) return parseFloat(labelMatch[1]);

  return 0;
}

// ─── Product page parsers ──────────────────────────────────────────────────────

function parseClearlyDevProduct(markdown: string, url: string, html?: string): ExternalProduct | null {
  let name = '';

  const pageTitleMatch = markdown.match(/^(.+?)\s*\\\|.*ClearlyDev/m);
  if (pageTitleMatch) {
    const candidate = pageTitleMatch[1].trim();
    if (candidate.length >= 3 && !candidate.toLowerCase().includes('hi, there')) {
      name = candidate;
    }
  }

  if (!name) {
    const headingRegex = /^#{1,2}\s+(.+?)(?:\s*\\\|\s*$)/gm;
    let hMatch;
    const skipPatterns = /^(hi,?\s*there|description|refund|instant|reviews?|related|license|file\s*size)/i;
    while ((hMatch = headingRegex.exec(markdown)) !== null) {
      const candidate = hMatch[1].trim();
      if (candidate.length >= 3 && !skipPatterns.test(candidate)) {
        name = candidate;
        break;
      }
    }
  }

  if (!name) {
    // Try og:title from HTML
    if (html) {
      const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
      if (ogTitle && ogTitle[1] && ogTitle[1].length >= 3) {
        name = ogTitle[1].replace(/\s*[-|].*$/, '').trim();
      }
    }
  }

  if (!name) {
    const slugMatch = url.match(/\/product\/([^\/\?#]+)/);
    if (slugMatch) {
      name = slugMatch[1]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim();
    }
  }

  if (!name) return null;
  
  // ─── Extract product images ────────────────────────────────────────────────
  const images: string[] = [];
  const seenImageUrls = new Set<string>();

  const addImage = (rawUrl: string, alt: string = '') => {
    if (!isProductImage(rawUrl, alt)) return;
    // Resolve Next.js /_next/image proxy to underlying URL
    const resolved = resolveNextImageUrl(rawUrl);
    // Deduplicate by resolved URL
    if (seenImageUrls.has(resolved)) return;
    seenImageUrls.add(resolved);
    // Use the original URL for downloading (it will redirect/serve properly)
    images.push(rawUrl.startsWith('http') ? rawUrl : `https://clearlydev.com${rawUrl}`);
  };

  if (html) {
    // 1) OG image — usually the primary product hero
    const ogMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    if (ogMatch?.[1]) {
      addImage(ogMatch[1]);
    }

    // 2) Twitter card image (backup)
    const twitterMatch = html.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]+)"/i);
    if (twitterMatch?.[1]) {
      addImage(twitterMatch[1]);
    }

    // 3) All <img> tags — prioritize those inside product containers
    const allImgTags = [...html.matchAll(/<img[^>]*?\bsrc="([^"]+)"[^>]*?(?:alt="([^"]*)")?[^>]*?>/gi)];
    // Also capture reversed attribute order (alt before src)
    const altFirstTags = [...html.matchAll(/<img[^>]*?\balt="([^"]*)"[^>]*?\bsrc="([^"]+)"[^>]*?>/gi)];

    for (const m of allImgTags) {
      addImage(m[1], m[2] || '');
    }
    for (const m of altFirstTags) {
      addImage(m[2], m[1] || '');
    }

    // 4) data-src for lazy-loaded images
    const lazySrcTags = [...html.matchAll(/<img[^>]*?\bdata-src="([^"]+)"[^>]*?(?:alt="([^"]*)")?[^>]*?>/gi)];
    for (const m of lazySrcTags) {
      addImage(m[1], m[2] || '');
    }

    // 5) srcset entries (pick the largest)
    const srcsetTags = [...html.matchAll(/<img[^>]*?\bsrcset="([^"]+)"[^>]*?>/gi)];
    for (const m of srcsetTags) {
      const entries = m[1].split(',').map(e => e.trim());
      // Pick last entry (usually the largest)
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        const srcFromSet = lastEntry.split(/\s+/)[0];
        if (srcFromSet) addImage(srcFromSet);
      }
    }

    // 6) Background images in style attributes
    const bgImages = [...html.matchAll(/style="[^"]*background-image:\s*url\((['"]?)([^)'"]+)\1\)/gi)];
    for (const m of bgImages) {
      addImage(m[2]);
    }
  }

  // Fallback: extract from markdown if HTML yielded nothing
  if (images.length === 0) {
    const imageRegex = /!\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/g;
    let imgMatch;
    while ((imgMatch = imageRegex.exec(markdown)) !== null) {
      addImage(imgMatch[2], imgMatch[1] || '');
    }
  }
  
  const price = extractPrice(markdown);
  
  let description = '';
  if (html) {
    description = extractHtmlDescription(html);
  }
  
  if (!description) {
    const descStart = markdown.indexOf('Description');
    const descEnd = markdown.indexOf('## ') > descStart ? markdown.indexOf('## ', descStart + 10) : markdown.length;
    if (descStart > -1) {
      description = markdown.substring(descStart + 11, descEnd)
        .replace(/!\[.*?\]\([^\)]+\)/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, 2000);
    }
  }
  
  const categorySlug = suggestCategory(name, description);

  // Limit to max 8 product images
  const finalImages = images.slice(0, 8);

  return {
    name,
    description,
    price,
    images: finalImages,
    sourceUrl: url,
    platform: 'clearlydev',
    suggestedCategoryId: categorySlug,
  };
}

// Parse BuiltByBit store/member page
function parseBuiltByBitStore(markdown: string, storeUrl: string): ExternalProduct[] {
  const products: ExternalProduct[] = [];
  
  const productLinkRegex = /\[([^\]]+)\]\((https:\/\/builtbybit\.com\/resources\/[^\)]+)\)/g;
  
  let match;
  const seenUrls = new Set<string>();
  
  while ((match = productLinkRegex.exec(markdown)) !== null) {
    const name = match[1].trim();
    const url = match[2];
    
    if (seenUrls.has(url) || name.length < 3 || url.includes('/creators')) continue;
    if (url.match(/\/resources\/[^\/]+\/$/)) continue;
    seenUrls.add(url);
    
    const categorySlug = suggestCategory(name, '');
    
    products.push({
      name,
      description: '',
      price: 0,
      images: [],
      sourceUrl: url,
      platform: 'builtbybit',
      suggestedCategoryId: categorySlug,
    });
  }
  
  return products;
}

// Parse BuiltByBit product detail page
function parseBuiltByBitProduct(markdown: string, url: string, html?: string): ExternalProduct | null {
  let name = '';

  // Try og:title
  if (html) {
    const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
    if (ogTitle?.[1]) {
      name = ogTitle[1].replace(/\s*[-|].*BuiltByBit.*$/i, '').trim();
    }
  }

  if (!name) {
    // Try markdown headings
    const headingMatch = markdown.match(/^#{1,2}\s+(.+)/m);
    if (headingMatch) {
      const candidate = headingMatch[1].replace(/\s*\|.*$/, '').trim();
      if (candidate.length >= 3) name = candidate;
    }
  }

  if (!name) {
    const slugMatch = url.match(/\/resources\/([^\/\?#\.]+)/);
    if (slugMatch) {
      name = slugMatch[1]
        .replace(/\.\d+$/, '') // remove trailing .12345
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim();
    }
  }

  if (!name) return null;

  // Images
  const images: string[] = [];
  const seenImageUrls = new Set<string>();

  if (html) {
    const ogImg = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    if (ogImg?.[1] && isProductImage(ogImg[1], '')) {
      images.push(ogImg[1]);
      seenImageUrls.add(ogImg[1]);
    }

    const allImgs = [...html.matchAll(/<img[^>]*?\bsrc="([^"]+)"[^>]*?(?:alt="([^"]*)")?[^>]*?>/gi)];
    for (const m of allImgs) {
      const src = m[1];
      const alt = m[2] || '';
      if (isProductImage(src, alt) && !seenImageUrls.has(src)) {
        seenImageUrls.add(src);
        images.push(src);
      }
    }
  }

  if (images.length === 0) {
    const imgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/g;
    let m;
    while ((m = imgRegex.exec(markdown)) !== null) {
      if (isProductImage(m[2], m[1]) && !seenImageUrls.has(m[2])) {
        seenImageUrls.add(m[2]);
        images.push(m[2]);
      }
    }
  }

  const price = extractPrice(markdown);

  // Description
  let description = '';
  const descMatch = markdown.match(/(?:Overview|Description|About)[:\s]*([\s\S]*?)(?=\n#{1,3}\s|\n---|\$\{|$)/i);
  if (descMatch?.[1]) {
    description = descMatch[1]
      .replace(/!\[.*?\]\([^\)]+\)/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, 2000);
  }

  const categorySlug = suggestCategory(name, description);

  return {
    name,
    description,
    price,
    images: images.slice(0, 8),
    sourceUrl: url,
    platform: 'builtbybit',
    suggestedCategoryId: categorySlug,
  };
}

// ─── Payhip parsers ───────────────────────────────────────────────────────────

// Common CTA / button labels that should not be treated as product names
const PAYHIP_CTA_PATTERNS = /^(purchase\s*now|buy\s*now|add\s*to\s*cart|get\s*it\s*now|visit\s*product\s*page|view\s*product|checkout|proceed|download|learn\s*more|see\s*more|read\s*more|sign\s*up|subscribe|free\s*download|get\s*access|view\s*details?|shop\s*now|shop\s*all|shop\s*\w+|view\s*all|buy\s*now|follow|added\s*to\s*cart|adding\s*\.\.\.|save|share|tweet|proceed\s*to\s*checkout|copy\s*link|watch\s*on|accept|cancel\s*confirm|cancel)$/i;

// Skip sections/headings that are store banners, not product names
const PAYHIP_BANNER_PATTERNS = /^(best\s*deals?|latest\s*products?|terms\s*of\s*service|more\s*videos|share|ww2?\s*products?|5,?\d*\+?\s*orders?|.*exclusive|.*terms|featured|collections?|all\s*products?|about|contact|faq|support)$/i;

function parsePayhipStore(markdown: string, storeUrl: string, links?: string[]): { products: ExternalProduct[]; sellerName?: string } {
  // Extract seller name from URL path
  let sellerName: string | undefined;
  const storeSlugMatch = storeUrl.match(/payhip\.com\/([A-Za-z0-9_-]+)/);
  if (storeSlugMatch && !['b', 'collection', 'explore', 'themes', 'api-reference'].includes(storeSlugMatch[1].toLowerCase())) {
    sellerName = storeSlugMatch[1];
  }

  // Collect all /b/ product URLs from the links array (these are in page order)
  const productUrls: string[] = [];
  if (links) {
    for (const link of links) {
      if (/payhip\.com\/b\/[A-Za-z0-9]+$/.test(link) && !productUrls.includes(link)) {
        productUrls.push(link);
      }
    }
  }

  // Also find /b/ URLs from markdown
  const mdLinkRegex = /\(?(https:\/\/payhip\.com\/b\/[A-Za-z0-9]+)\)?/g;
  let mdMatch;
  while ((mdMatch = mdLinkRegex.exec(markdown)) !== null) {
    const url = mdMatch[1];
    if (!productUrls.includes(url)) {
      productUrls.push(url);
    }
  }

  console.log(`Found ${productUrls.length} product URLs from links/markdown`);

  // Parse structured product listings from markdown
  // Collection pages show: ![](image)\n\n#### Name\n\n£XX.XX
  // Store pages show: #### Name\n\n£XX.XX (under section headings)
  const mdLines = markdown.split('\n');
  const structuredProducts: Array<{ name: string; price: number; images: string[] }> = [];

  for (let i = 0; i < mdLines.length; i++) {
    const line = mdLines[i].trim();

    // Look for #### headings (product names)
    const h4Match = line.match(/^#{1,4}\s+(.+)/);
    if (!h4Match) continue;

    const candidateName = h4Match[1].replace(/\\\[/g, '[').replace(/\\\]/g, ']').replace(/\*+/g, '').trim();
    if (candidateName.length < 3) continue;
    if (PAYHIP_CTA_PATTERNS.test(candidateName)) continue;
    if (PAYHIP_BANNER_PATTERNS.test(candidateName)) continue;
    // Skip section headings that use # or ## (collection/store section names)
    if (line.match(/^#{1,2}\s/) && !line.match(/^#{3,4}\s/)) continue;

    // Look for price in the next few lines
    let price = 0;
    for (let j = i + 1; j < Math.min(i + 6, mdLines.length); j++) {
      const priceLine = mdLines[j].trim();
      // Match £XX.XX or $XX.XX (on its own line or with surrounding text)
      const priceMatch = priceLine.match(/[£$](\d+(?:\.\d{1,2})?)/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1]);
        break;
      }
      // Stop if we hit another heading or image (next product)
      if (priceLine.startsWith('#') || (priceLine.startsWith('![') && priceLine.includes('s3.amazonaws.com'))) break;
    }

    // Look for images above this heading (within 5 lines back)
    const images: string[] = [];
    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
      const imgLine = mdLines[j].trim();
      const imgMatches = [...imgLine.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g)];
      if (imgMatches.length > 0) {
        for (const m of imgMatches) {
          const src = m[1];
          if (src.includes('s3.amazonaws.com') || src.includes('cdn-cgi/image')) {
            images.push(src);
          }
        }
        break;
      }
      // Stop if we hit content (non-empty, non-image)
      if (imgLine.length > 0 && !imgLine.startsWith('![')) break;
    }

    // Skip duplicates by name
    const isDupe = structuredProducts.some(p => p.name.toLowerCase() === candidateName.toLowerCase());
    if (!isDupe) {
      structuredProducts.push({ name: candidateName, price, images: images.slice(0, 4) });
    }
  }

  console.log(`Parsed ${structuredProducts.length} structured products from markdown`);

  // Build final product list by matching structured products with URLs
  const products: ExternalProduct[] = [];

  if (productUrls.length > 0 && structuredProducts.length > 0) {
    // Match by order: structured products appear in the same order as /b/ URLs
    // This works well for collection pages where products and links are in page order
    const matchCount = Math.min(productUrls.length, structuredProducts.length);
    for (let i = 0; i < matchCount; i++) {
      const sp = structuredProducts[i];
      const url = productUrls[i];
      products.push({
        name: sp.name,
        description: '',
        price: sp.price,
        images: sp.images,
        sourceUrl: url,
        platform: 'payhip',
        suggestedCategoryId: suggestCategory(sp.name, ''),
      });
    }

    // Any remaining URLs without structured data get code-based names
    for (let i = matchCount; i < productUrls.length; i++) {
      const url = productUrls[i];
      const codeMatch = url.match(/\/b\/([A-Za-z0-9]+)$/);
      const fallbackName = codeMatch ? `Product ${codeMatch[1]}` : 'Unknown Product';
      products.push({
        name: fallbackName,
        description: '',
        price: 0,
        images: [],
        sourceUrl: url,
        platform: 'payhip',
      });
    }

    // Any remaining structured products without URLs (can't import without URL)
    // are skipped
  } else if (productUrls.length > 0) {
    // Only URLs, no structured data
    for (const url of productUrls) {
      const codeMatch = url.match(/\/b\/([A-Za-z0-9]+)$/);
      const fallbackName = codeMatch ? `Product ${codeMatch[1]}` : 'Unknown Product';
      products.push({
        name: fallbackName,
        description: '',
        price: 0,
        images: [],
        sourceUrl: url,
        platform: 'payhip',
      });
    }
  } else if (structuredProducts.length > 0) {
    // Only structured data, no URLs — can't import
    console.log(`Warning: Found ${structuredProducts.length} products but no /b/ URLs to import`);
  }

  return { products, sellerName };
}

function parsePayhipProduct(markdown: string, url: string, html?: string): ExternalProduct | null {
  let name = '';

  // Try og:title from HTML
  if (html) {
    const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
    if (ogTitle?.[1]) {
      name = ogTitle[1].replace(/\s*[-|].*Payhip.*$/i, '').trim();
    }
  }

  // Try markdown heading — but skip CTA/banner patterns
  if (!name) {
    const headings = [...markdown.matchAll(/^#{1,4}\s+(.+)/gm)];
    for (const h of headings) {
      const candidate = h[1].replace(/\\?\|/g, '').replace(/\*+/g, '').trim();
      if (candidate.length < 3) continue;
      if (PAYHIP_CTA_PATTERNS.test(candidate)) continue;
      if (PAYHIP_BANNER_PATTERNS.test(candidate)) continue;
      name = candidate;
      break;
    }
  }

  if (!name) return null;

  // Images — improved extraction
  const images: string[] = [];
  const seenImageUrls = new Set<string>();

  if (html) {
    // OG image first
    const ogImg = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    if (ogImg?.[1] && !SKIP_TINY_DATA_URI.test(ogImg[1])) {
      images.push(ogImg[1]);
      seenImageUrls.add(ogImg[1]);
    }

    // Product images — Payhip uses cdn-cgi/image proxy or S3 URLs
    const allImgs = [...html.matchAll(/<img[^>]*?\bsrc="([^"]+)"[^>]*?>/gi)];
    for (const m of allImgs) {
      const src = m[1];
      if (src.includes('loading.gif') || src.includes('favicon') || src.includes('payhip.com/images/')) continue;
      if (SKIP_TINY_DATA_URI.test(src)) continue;
      if (seenImageUrls.has(src)) continue;
      // Only keep product-relevant images (S3, CDN, or ytimg for video thumbnails)
      if (src.includes('s3.amazonaws.com') || src.includes('cdn-cgi/image')) {
        seenImageUrls.add(src);
        images.push(src);
      }
    }
  }

  // Also extract from markdown (catches images not in HTML img tags)
  const imgRegex = /!\[[^\]]*\]\((https?:\/\/[^\)]+)\)/g;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(markdown)) !== null) {
    const src = imgMatch[1];
    if (src.includes('loading.gif') || src.includes('payhip.com/images/')) continue;
    if (seenImageUrls.has(src)) continue;
    if (src.includes('s3.amazonaws.com') || src.includes('cdn-cgi/image')) {
      seenImageUrls.add(src);
      images.push(src);
    }
  }

  // Price — try HTML meta first, then extract from markdown
  let price = 0;
  if (html) {
    // Payhip sometimes includes price in meta tags
    const ogPrice = html.match(/<meta[^>]*property="og:price:amount"[^>]*content="([^"]+)"/i)
      || html.match(/<meta[^>]*property="product:price:amount"[^>]*content="([^"]+)"/i);
    if (ogPrice?.[1]) {
      price = parseFloat(ogPrice[1]) || 0;
    }
    // Also try data attributes or specific price elements
    if (price === 0) {
      const priceEl = html.match(/class="[^"]*product-price[^"]*"[^>]*>[\s\S]*?[£$](\d+(?:\.\d{1,2})?)/i)
        || html.match(/class="[^"]*sale-price[^"]*"[^>]*>[\s\S]*?[£$](\d+(?:\.\d{1,2})?)/i);
      if (priceEl?.[1]) {
        price = parseFloat(priceEl[1]) || 0;
      }
    }
  }
  
  if (price === 0) {
    // Try extracting from the first price line in markdown (closest to the product name)
    // Payhip product pages show: "£XX.XX" or "On Sale £XX.XX (XX% off) £XX.XX"
    const priceLines = markdown.match(/[£$](\d+(?:\.\d{1,2})?)/g);
    if (priceLines && priceLines.length > 0) {
      // If there's a sale, the actual price is typically the lower one
      const prices = priceLines.map(p => parseFloat(p.replace(/[£$]/, ''))).filter(p => p > 0);
      if (prices.length > 0) {
        price = Math.min(...prices); // Use the lowest (sale) price
      }
    }
  }

  // Description — everything after the heading and price/cart section
  let description = '';
  const lines = markdown.split('\n');
  let startCapture = false;
  const descLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!startCapture) {
      // Start capturing after the price/buy section
      if (/^(Buy Now|Add to Cart|Proceed to Checkout|Added to cart|Adding \.\.\.)/i.test(trimmed)) {
        startCapture = true;
        continue;
      }
      continue;
    }
    // Stop at footer-like sections
    if (/^(Powered by|Terms|Get updates|## Share|Save|Share|Tweet|Visit product page|You will get)/i.test(trimmed)) break;
    if (/^(Added to wishlist|Add to wishlist)/i.test(trimmed)) continue;
    // Skip YouTube embed noise
    if (/^(Watch later|Copy link|Watch on|Tap to unmute|If playback|You're signed out|More videos|Up Next|Autoplay|Info|Shopping|Search)/i.test(trimmed)) continue;
    descLines.push(line);
  }
  description = descLines.join('\n').trim().slice(0, 5000);

  const categorySlug = suggestCategory(name, description);

  return {
    name,
    description,
    price,
    images: images.slice(0, 8),
    sourceUrl: url,
    platform: 'payhip',
    suggestedCategoryId: categorySlug,
  };
}

// ─── Error categorisation ──────────────────────────────────────────────────────

/** Returns true for errors that are worth retrying (network, timeout, 429, 5xx) */
function isRetryableError(error: string | undefined): boolean {
  if (!error) return false;
  const lower = error.toLowerCase();
  return (
    lower.includes('timeout') ||
    lower.includes('abort') ||
    lower.includes('network') ||
    lower.includes('econnreset') ||
    lower.includes('429') ||
    lower.includes('rate limit') ||
    /\b5\d{2}\b/.test(lower) || // 5xx status codes
    lower.includes('failed to fetch') ||
    lower.includes('failed after retries')
  );
}

/** Convert raw error strings into user-friendly messages */
function friendlyErrorMessage(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('already imported')) return 'Already imported';
  if (lower.includes('could not parse')) return 'Could not read product details from page';
  if (lower.includes('timeout') || lower.includes('abort')) return 'Request timed out — the page took too long to load';
  if (lower.includes('429') || lower.includes('rate limit')) return 'Rate limited — too many requests, try again shortly';
  if (/\b5\d{2}\b/.test(lower)) return 'Server error — the external site had an issue';
  if (lower.includes('network') || lower.includes('failed to fetch')) return 'Network error — could not reach the page';
  if (lower.includes('not configured')) return 'Import service not configured';
  if (lower.includes('db error')) return 'Database error while saving product';
  return raw;
}

// ─── Scraping with retry ───────────────────────────────────────────────────────

const SCRAPE_TIMEOUT_MS = 30_000; // 30 seconds per scrape attempt

async function scrapeUrl(
  url: string,
  apiKey: string,
  retries = 2,
): Promise<{ success: boolean; markdown?: string; html?: string; links?: string[]; error?: string; retryable?: boolean }> {
  console.log(`Scraping: ${url}`);

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);

    try {
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['markdown', 'html', 'links'],
          onlyMainContent: false,
          waitFor: 5000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429 || response.status >= 500) {
        if (attempt < retries) {
          const delay = 1000 * (attempt + 1);
          console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${retries})...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        const errText = `HTTP ${response.status}`;
        return { success: false, error: friendlyErrorMessage(errText), retryable: true };
      }

      const data = await response.json();

      if (!response.ok) {
        console.error('Firecrawl error:', data);
        return { success: false, error: friendlyErrorMessage(data.error || `Failed with status ${response.status}`), retryable: false };
      }

      const markdown = data.data?.markdown || data.markdown || '';
      const html = data.data?.html || data.html || '';
      const links = data.data?.links || data.links || [];

      console.log(`Scraped ${markdown.length} chars markdown, ${html.length} chars html, ${links.length} links`);

      return { success: true, markdown, html, links };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const errMsg = err instanceof Error ? err.message : String(err);
      const isAbort = errMsg.toLowerCase().includes('abort');

      if (attempt < retries) {
        const delay = 1000 * (attempt + 1);
        console.log(`Scrape error (${isAbort ? 'timeout' : 'network'}), retrying in ${delay}ms: ${errMsg}`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      console.error('Scrape failed after retries:', errMsg);
      return { success: false, error: friendlyErrorMessage(isAbort ? 'Timeout' : `Network error: ${errMsg}`), retryable: true };
    }
  }

  return { success: false, error: 'Failed after retries', retryable: true };
}

// ─── Image download & upload ───────────────────────────────────────────────────

async function downloadAndUploadImage(
  imageUrl: string, 
  storeId: string, 
  productSlug: string,
  imageIndex: number,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<string | null> {
  try {
    // Resolve Next.js image proxy URLs to the underlying image
    const resolvedUrl = resolveNextImageUrl(imageUrl);
    const downloadUrl = resolvedUrl.startsWith('http') ? resolvedUrl : imageUrl;

    // Validate image URL — only allow HTTP(S)
    try {
      const parsed = new URL(downloadUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        console.log(`Skipping non-HTTP image URL: ${downloadUrl}`);
        return null;
      }
    } catch {
      return null;
    }

    console.log(`Downloading image: ${downloadUrl}`);
    
    // Add a 15-second timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    let response: Response;
    try {
      response = await fetch(downloadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EclipseImporter/1.0)',
          'Accept': 'image/*,*/*',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!response.ok) {
      console.error(`Failed to download image: ${response.status}`);
      return null;
    }

    const finalUrl = response.url || downloadUrl;
    if (/\b(rbxcdn\.com|roblox\.com)\b/i.test(finalUrl)) {
      console.log(`Skipping Roblox placeholder image: ${finalUrl}`);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      console.log(`Skipping non-image content type: ${contentType}`);
      return null;
    }
    
    const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : contentType.includes('gif') ? 'gif' : 'jpg';
    const blob = await response.blob();
    
    // Reject oversized files (>10MB)
    if (blob.size > 10 * 1024 * 1024) {
      console.log(`Skipping oversized image: ${blob.size} bytes`);
      return null;
    }
    
    // Skip tiny images (< 5KB) — likely logos, icons, tracking pixels
    if (blob.size < 5 * 1024) {
      console.log(`Skipping tiny image (likely logo/icon): ${blob.size} bytes - ${downloadUrl}`);
      return null;
    }
    
    const arrayBuffer = await blob.arrayBuffer();
    
    const filePath = `${storeId}/${productSlug}-import-${imageIndex}.${extension}`;
    
    const { data, error } = await supabaseAdmin.storage
      .from('product-images')
      .upload(filePath, new Uint8Array(arrayBuffer), {
        contentType,
        upsert: true,
      });
    
    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }
    
    const { data: urlData } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(filePath);
    
    console.log(`Uploaded image ${imageIndex}: ${urlData.publicUrl} (${(blob.size / 1024).toFixed(1)}KB)`);
    return urlData.publicUrl;
  } catch (err) {
    console.error('Image download error:', err);
    return null;
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.EXPENSIVE, identifier: clientIp, action: 'import-external-products' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { action, storeUrl, productUrl, productUrls, platform, downloadImages, targetStoreId, categoryOverride } = body as any;

    // Validate action
    const validActions = ['list', 'details', 'bulk-details', 'history'];
    if (!action || !validActions.includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate targetStoreId format if provided
    if (targetStoreId && !UUID_REGEX.test(targetStoreId)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid store ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlApiKey) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Import service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if user is admin
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const isAdmin = userRoles?.some(r => r.role === 'admin') ?? false;

    if (!isAdmin) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('discord_username, discord_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.discord_username && !profile?.discord_id) {
        return new Response(
          JSON.stringify({ success: false, error: "You must link your Discord account first" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    let store: { id: string; name: string; slug: string } | null = null;

    if (targetStoreId) {
      // Admin can access any store; non-admins must own it or be a team member
      if (isAdmin) {
        const { data: targetStore } = await supabaseAdmin
          .from('stores')
          .select('id, name, slug')
          .eq('id', targetStoreId)
          .eq('status', 'approved')
          .single();
        store = targetStore;
      } else {
        // Check ownership first
        const { data: ownedStore } = await supabaseAdmin
          .from('stores')
          .select('id, name, slug')
          .eq('id', targetStoreId)
          .eq('owner_id', user.id)
          .eq('status', 'approved')
          .maybeSingle();

        if (ownedStore) {
          store = ownedStore;
        } else {
          // Check team membership
          const { data: teamMember } = await supabaseAdmin
            .from('store_team_members')
            .select('store_id')
            .eq('store_id', targetStoreId)
            .eq('user_id', user.id)
            .not('accepted_at', 'is', null)
            .maybeSingle();

          if (teamMember) {
            const { data: teamStore } = await supabaseAdmin
              .from('stores')
              .select('id, name, slug')
              .eq('id', targetStoreId)
              .eq('status', 'approved')
              .single();
            store = teamStore;
          }
        }
      }
    } else {
      // No targetStoreId — fallback to first owned store
      const { data: ownStore } = await supabaseAdmin
        .from('stores')
        .select('id, name, slug')
        .eq('owner_id', user.id)
        .eq('status', 'approved')
        .limit(1)
        .maybeSingle();
      store = ownStore;
    }

    if (!store) {
      return new Response(
        JSON.stringify({ success: false, error: "You must have an approved store to import products" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch categories for auto-matching
    const { data: categories } = await supabaseAdmin
      .from('categories')
      .select('id, slug, name');
    
    const categoryMap = new Map(categories?.map(c => [c.slug, c.id]) || []);

    // ─── Action: List products from external store ─────────────────────────────
    if (action === 'list') {
      if (!storeUrl || typeof storeUrl !== 'string') {
        return new Response(
          JSON.stringify({ success: false, error: "Store URL is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!isAllowedScrapeUrl(storeUrl)) {
        return new Response(
          JSON.stringify({ success: false, error: "Unsupported platform. Use ClearlyDev, BuiltByBit, or Payhip URLs." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let detectedPlatform = platform;
      if (!detectedPlatform) {
        if (storeUrl.includes('clearlydev.com')) detectedPlatform = 'clearlydev';
        else if (storeUrl.includes('builtbybit.com')) detectedPlatform = 'builtbybit';
        else if (storeUrl.includes('payhip.com')) detectedPlatform = 'payhip';
        else {
          return new Response(
            JSON.stringify({ success: false, error: "Unsupported platform. Use ClearlyDev, BuiltByBit, or Payhip URLs." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      console.log(`Listing products from ${detectedPlatform}: ${storeUrl}`);

      const scrapeResult = await scrapeUrl(storeUrl, firecrawlApiKey);
      if (!scrapeResult.success) {
        return new Response(
          JSON.stringify({ success: false, error: scrapeResult.error || "Failed to scrape store" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let products: ExternalProduct[] = [];
      let sellerName: string | undefined;
      if (detectedPlatform === 'clearlydev') {
        const result = parseClearlyDevStore(scrapeResult.markdown!, storeUrl, scrapeResult.links);
        products = result.products;
        sellerName = result.sellerName;
      } else if (detectedPlatform === 'builtbybit') {
        products = parseBuiltByBitStore(scrapeResult.markdown!, storeUrl);
      } else if (detectedPlatform === 'payhip') {
        const result = parsePayhipStore(scrapeResult.markdown!, storeUrl, scrapeResult.links);
        products = result.products;
        sellerName = result.sellerName;
      }

      // Check for already imported products
      const { data: existingImports } = await supabaseAdmin
        .from('product_imports')
        .select('source_url, product_id')
        .eq('store_id', store.id)
        .eq('status', 'completed')
        .not('product_id', 'is', null);
      
      const importedUrls = new Set(existingImports?.map(i => i.source_url) || []);
      
      products = products.map(p => ({
        ...p,
        alreadyImported: importedUrls.has(p.sourceUrl),
        suggestedCategoryId: p.suggestedCategoryId ? categoryMap.get(p.suggestedCategoryId) : undefined,
      }));

      console.log(`Found ${products.length} products`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          products,
          platform: detectedPlatform,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Action: Fetch full product details ────────────────────────────────────
    if (action === 'details') {
      if (!productUrl || typeof productUrl !== 'string') {
        return new Response(
          JSON.stringify({ success: false, error: "Product URL is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!isAllowedScrapeUrl(productUrl)) {
        return new Response(
          JSON.stringify({ success: false, error: "Unsupported platform URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let detectedPlatform = platform;
      if (!detectedPlatform) {
        if (productUrl.includes('clearlydev.com')) detectedPlatform = 'clearlydev';
        else if (productUrl.includes('builtbybit.com')) detectedPlatform = 'builtbybit';
        else if (productUrl.includes('payhip.com')) detectedPlatform = 'payhip';
      }

      console.log(`Fetching product details from ${detectedPlatform}: ${productUrl}`);

      const scrapeResult = await scrapeUrl(productUrl, firecrawlApiKey);
      if (!scrapeResult.success) {
        return new Response(
          JSON.stringify({ success: false, error: scrapeResult.error || "Failed to scrape product" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let product: ExternalProduct | null = null;
      if (detectedPlatform === 'clearlydev') {
        product = parseClearlyDevProduct(scrapeResult.markdown!, productUrl, scrapeResult.html);
      } else if (detectedPlatform === 'builtbybit') {
        product = parseBuiltByBitProduct(scrapeResult.markdown!, productUrl, scrapeResult.html);
      } else if (detectedPlatform === 'payhip') {
        product = parsePayhipProduct(scrapeResult.markdown!, productUrl, scrapeResult.html);
      }

      if (!product) {
        return new Response(
          JSON.stringify({ success: false, error: "Could not read product details from page", retryable: true }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check for duplicate import
      const { data: existingImport } = await supabaseAdmin
        .from('product_imports')
        .select('product_id')
        .eq('store_id', store.id)
        .eq('source_url', productUrl)
        .eq('status', 'completed')
        .not('product_id', 'is', null)
        .maybeSingle();

      if (existingImport) {
        return new Response(
          JSON.stringify({ success: false, error: "This product has already been imported", retryable: false }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Download and re-upload images if requested — in parallel for speed
      const originalImageCount = product.images.length;
      if (downloadImages && product.images.length > 0) {
        console.log(`Downloading ${product.images.length} images in parallel...`);
        const productSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) + '-' + crypto.randomUUID().slice(0, 6);
        
        const uploadPromises = product.images.map((imgUrl, i) =>
          downloadAndUploadImage(imgUrl, store.id, productSlug, i, supabaseAdmin)
        );
        const uploadResults = await Promise.all(uploadPromises);
        const uploadedImages = uploadResults.filter((u): u is string => u !== null);
        
        console.log(`Successfully uploaded ${uploadedImages.length}/${originalImageCount} images`);
        product.images = uploadedImages.length > 0 ? uploadedImages : product.images;
      }

      // Use category override if provided, otherwise fall back to suggested
      const finalCategoryId = categoryOverride || (product.suggestedCategoryId 
        ? categoryMap.get(product.suggestedCategoryId) 
        : undefined);
      product.suggestedCategoryId = finalCategoryId;

      // Auto-create product record with robust unique slug
      const productSlugForDb = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
      const randomSuffix = crypto.randomUUID().slice(0, 8);
      const uniqueSlug = `${productSlugForDb}-${randomSuffix}`;
      
      const { data: createdProduct, error: createError } = await supabaseAdmin
        .from('products')
        .insert({
          name: product.name,
          slug: uniqueSlug,
          description: stripBlockedUrls(product.description) || null,
          price: product.price || 0,
          seller_price: product.price || 0,
          images: product.images.length > 0 ? product.images : [],
          store_id: store.id,
          is_seller_product: true,
          is_active: false,
          category_id: product.suggestedCategoryId || null,
          external_link: product.sourceUrl || null,
          moderation_status: 'approved',
        })
        .select('id')
        .single();

      if (createError) {
        console.error(`Failed to create product record:`, createError.message);
        // Record the failed import
        await supabaseAdmin.from('product_imports').insert({
          store_id: store.id,
          source_url: productUrl,
          source_platform: detectedPlatform || 'unknown',
          source_name: product.name,
          source_price: product.price,
          imported_by: user.id,
          status: 'failed',
          error_message: createError.message,
          metadata: { images_downloaded: downloadImages, image_count: originalImageCount },
        });
        return new Response(
          JSON.stringify({ success: false, error: friendlyErrorMessage(`DB error: ${createError.message}`), retryable: false }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Record the successful import
      await supabaseAdmin.from('product_imports').insert({
        store_id: store.id,
        source_url: productUrl,
        source_platform: detectedPlatform || 'unknown',
        source_name: product.name,
        source_price: product.price,
        imported_by: user.id,
        status: 'completed',
        product_id: createdProduct.id,
        metadata: { images_downloaded: downloadImages, image_count: originalImageCount },
      });

      return new Response(
        JSON.stringify({ success: true, product }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Action: Bulk import multiple products ─────────────────────────────────
    if (action === 'bulk-details') {
      if (!productUrls || !Array.isArray(productUrls) || productUrls.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: "Product URLs array is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const safeUrls = productUrls.slice(0, 50).filter((u: any) => typeof u === 'string' && isAllowedScrapeUrl(u));

      console.log(`Bulk importing ${safeUrls.length} products (${productUrls.length - safeUrls.length} rejected)...`);
      
      // Parse categoryOverride as a map (url -> categoryId) if provided
      const categoryOverrides: Record<string, string> = typeof categoryOverride === 'object' && categoryOverride ? categoryOverride : {};
      
      const results: { url: string; success: boolean; product?: ExternalProduct; error?: string }[] = [];
      
      for (const url of safeUrls) {
        try {
          let detectedPlatform = platform;
          if (!detectedPlatform) {
            if (url.includes('clearlydev.com')) detectedPlatform = 'clearlydev';
            else if (url.includes('builtbybit.com')) detectedPlatform = 'builtbybit';
            else if (url.includes('payhip.com')) detectedPlatform = 'payhip';
          }

          // Check for duplicate
          const { data: existingImport } = await supabaseAdmin
            .from('product_imports')
            .select('product_id')
            .eq('store_id', store.id)
            .eq('source_url', url)
            .eq('status', 'completed')
            .not('product_id', 'is', null)
            .maybeSingle();

          if (existingImport) {
            results.push({ url, success: false, error: "Already imported" });
            continue;
          }

          const scrapeResult = await scrapeUrl(url, firecrawlApiKey);
          if (!scrapeResult.success) {
            results.push({ url, success: false, error: scrapeResult.error });
            await supabaseAdmin.from('product_imports').insert({
              store_id: store.id,
              source_url: url,
              source_platform: detectedPlatform || 'unknown',
              source_name: 'Unknown',
              imported_by: user.id,
              status: 'failed',
              error_message: scrapeResult.error,
            });
            continue;
          }

          let product: ExternalProduct | null = null;
          if (detectedPlatform === 'clearlydev') {
            product = parseClearlyDevProduct(scrapeResult.markdown!, url, scrapeResult.html);
          } else if (detectedPlatform === 'builtbybit') {
            product = parseBuiltByBitProduct(scrapeResult.markdown!, url, scrapeResult.html);
          } else if (detectedPlatform === 'payhip') {
            product = parsePayhipProduct(scrapeResult.markdown!, url, scrapeResult.html);
          }

          if (!product) {
            results.push({ url, success: false, error: "Could not parse product" });
            await supabaseAdmin.from('product_imports').insert({
              store_id: store.id,
              source_url: url,
              source_platform: detectedPlatform || 'unknown',
              source_name: 'Unknown',
              imported_by: user.id,
              status: 'failed',
              error_message: 'Could not parse product details',
            });
            continue;
          }

          const originalImageCount = product.images.length;
          if (downloadImages && product.images.length > 0) {
            const productSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) + '-' + crypto.randomUUID().slice(0, 6);
            
            const uploadPromises = product.images.map((imgUrl, i) =>
              downloadAndUploadImage(imgUrl, store.id, productSlug, i, supabaseAdmin)
            );
            const uploadResults = await Promise.all(uploadPromises);
            const uploadedImages = uploadResults.filter((u): u is string => u !== null);
            
            if (uploadedImages.length > 0) {
              product.images = uploadedImages;
            }
          }

          // Apply category override for this URL, or fall back to auto-suggestion
          const urlCategoryOverride = categoryOverrides[url];
          product.suggestedCategoryId = urlCategoryOverride || (product.suggestedCategoryId 
            ? categoryMap.get(product.suggestedCategoryId) 
            : undefined);

          const productSlugForDb = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
          const randomSuffix = crypto.randomUUID().slice(0, 8);
          const uniqueSlug = `${productSlugForDb}-${randomSuffix}`;
          
          const { data: createdProduct, error: createError } = await supabaseAdmin
            .from('products')
            .insert({
              name: product.name,
              slug: uniqueSlug,
              description: stripBlockedUrls(product.description) || null,
              price: product.price || 0,
              seller_price: product.price || 0,
              images: product.images.length > 0 ? product.images : [],
              store_id: store.id,
              is_seller_product: true,
              is_active: false,
              category_id: product.suggestedCategoryId || null,
              external_link: product.sourceUrl || null,
              moderation_status: 'approved',
            })
            .select('id')
            .single();

          if (createError) {
            console.error(`Failed to create product record for "${product.name}":`, createError.message);
            results.push({ url, success: false, error: `DB error: ${createError.message}` });
            await supabaseAdmin.from('product_imports').insert({
              store_id: store.id,
              source_url: url,
              source_platform: detectedPlatform || 'unknown',
              source_name: product.name,
              source_price: product.price,
              imported_by: user.id,
              status: 'failed',
              error_message: createError.message,
              metadata: { images_downloaded: downloadImages, image_count: originalImageCount },
            });
            continue;
          }

          await supabaseAdmin.from('product_imports').insert({
            store_id: store.id,
            source_url: url,
            source_platform: detectedPlatform || 'unknown',
            source_name: product.name,
            source_price: product.price,
            imported_by: user.id,
            status: 'completed',
            product_id: createdProduct.id,
            metadata: { images_downloaded: downloadImages, image_count: originalImageCount },
          });

          results.push({ url, success: true, product });
        } catch (err) {
          console.error(`Unexpected error importing ${url}:`, err);
          results.push({ url, success: false, error: `Unexpected error: ${err}` });
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          results,
          imported: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Action: Get import history ────────────────────────────────────────────
    if (action === 'history') {
      const { data: imports, error: historyError } = await supabaseAdmin
        .from('product_imports')
        .select('*')
        .eq('store_id', store.id)
        .order('imported_at', { ascending: false })
        .limit(50);

      if (historyError) {
        return new Response(
          JSON.stringify({ success: false, error: "Failed to load history" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, imports }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Import error:", errMsg, error);
    return new Response(
      JSON.stringify({ success: false, error: `Import failed: ${errMsg}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
