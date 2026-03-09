import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SITE_URL = "https://eclipserblx.com";
const SITE_NAME = "Eclipse";
const DEFAULT_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/6XoLGVy9Aseup6dIxodIWS9uGsS2/social-images/social-1772684689417-IMG_0084.webp";
const DEFAULT_DESCRIPTION = "Eclipse is the best Roblox asset marketplace. Buy premium roleplay scripts, vehicles, maps and game assets. Lower fees, instant delivery.";

// Static page metadata
const STATIC_PAGES: Record<string, { title: string; description: string; image?: string }> = {
  "/": { title: "Eclipse | Roblox Marketplace — Premium Assets, Lower Fees", description: DEFAULT_DESCRIPTION },
  "/products": { title: "Browse Products | Eclipse", description: "Browse hundreds of premium Roblox assets including scripts, vehicles, maps and more on Eclipse." },
  "/stores": { title: "Browse Stores | Eclipse", description: "Discover verified Roblox asset stores on Eclipse marketplace." },
  "/categories": { title: "Categories | Eclipse", description: "Browse Roblox assets by category — scripts, vehicles, maps, tools and more." },
  "/featured": { title: "Featured Products | Eclipse", description: "Hand-picked featured Roblox assets and top sellers on Eclipse." },
  "/eclipse-plus": { title: "Eclipse+ Membership | Eclipse", description: "Get exclusive perks, early access and discounts with Eclipse+ membership." },
  "/faq": { title: "FAQ | Eclipse", description: "Frequently asked questions about buying, selling and using Eclipse marketplace." },
  "/help-center": { title: "Help Centre | Eclipse", description: "Get help with your Eclipse account, orders, and more." },
  "/sell": { title: "Start Selling on Eclipse", description: "Sell your Roblox creations on Eclipse — lower fees, fast payouts, and a growing community." },
  "/contact": { title: "Contact Us | Eclipse", description: "Get in touch with the Eclipse team for support or enquiries." },
  "/affiliate": { title: "Affiliate Programme | Eclipse", description: "Earn commission by referring creators and buyers to Eclipse." },
  "/advertise": { title: "Advertise on Eclipse", description: "Promote your Roblox products to thousands of active buyers on Eclipse." },
  "/jobs": { title: "Jobs | Eclipse", description: "Join the Eclipse team — we're hiring passionate people to build the future of Roblox commerce." },
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildHtml(opts: {
  title: string;
  description: string;
  image: string;
  url: string;
  type?: string;
  extra?: string;
}): string {
  const { title, description, image, url, type = "website", extra = "" } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(url)}" />

  <meta property="og:type" content="${type}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  ${extra}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@EclipseRblx" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />

  <meta http-equiv="refresh" content="0;url=${escapeHtml(url)}" />
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(url)}">${escapeHtml(title)}</a>…</p>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "/";

  // --- Static pages ---
  const staticMeta = STATIC_PAGES[path];
  if (staticMeta) {
    const html = buildHtml({
      title: staticMeta.title,
      description: staticMeta.description,
      image: staticMeta.image || DEFAULT_IMAGE,
      url: `${SITE_URL}${path}`,
    });
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600", ...corsHeaders },
    });
  }

  // --- Dynamic pages ---
  const productMatch = path.match(/^\/products\/([a-zA-Z0-9][a-zA-Z0-9\-_]{0,200})$/);
  const storeMatch = path.match(/^\/store\/([a-zA-Z0-9][a-zA-Z0-9\-_]{0,200})$/);

  if (!productMatch && !storeMatch) {
    // Unknown path — redirect to site
    return new Response(null, {
      status: 302,
      headers: { Location: `${SITE_URL}${path}`, ...corsHeaders },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // --- Product page ---
  if (productMatch) {
    const slug = productMatch[1];
    const { data: product } = await supabase
      .from("products")
      .select("name, description, images, price, slug, stores(name)")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    const pageUrl = `${SITE_URL}/products/${encodeURIComponent(slug)}`;

    if (!product) {
      return new Response(null, { status: 302, headers: { Location: pageUrl, ...corsHeaders } });
    }

    const storeName = (product.stores as any)?.name;
    const rawDesc = product.description
      ? product.description.replace(/<[^>]*>/g, "").slice(0, 200)
      : `Check out ${product.name} on Eclipse`;
    const description = storeName ? `By ${storeName} — ${rawDesc}` : rawDesc;
    const ogImage = product.images?.[0] || DEFAULT_IMAGE;
    const priceExtra = product.price != null
      ? `<meta property="product:price:amount" content="${product.price}" />\n  <meta property="product:price:currency" content="GBP" />`
      : "";

    const html = buildHtml({
      title: `${product.name} | ${SITE_NAME}`,
      description,
      image: ogImage,
      url: pageUrl,
      type: "product",
      extra: priceExtra,
    });

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300", ...corsHeaders },
    });
  }

  // --- Store page ---
  if (storeMatch) {
    const slug = storeMatch[1];
    const { data: store } = await supabase
      .from("stores")
      .select("name, description, logo_url, slug, product_count")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    const pageUrl = `${SITE_URL}/store/${encodeURIComponent(slug)}`;

    if (!store) {
      return new Response(null, { status: 302, headers: { Location: pageUrl, ...corsHeaders } });
    }

    const description = store.description
      ? store.description.replace(/<[^>]*>/g, "").slice(0, 200)
      : `Browse ${store.name}'s products on Eclipse — ${store.product_count || 0} items available.`;
    const ogImage = store.logo_url || DEFAULT_IMAGE;

    const html = buildHtml({
      title: `${store.name} | ${SITE_NAME}`,
      description,
      image: ogImage,
      url: pageUrl,
      type: "profile",
    });

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600", ...corsHeaders },
    });
  }

  return new Response(null, { status: 302, headers: { Location: `${SITE_URL}${path}`, ...corsHeaders } });
});
