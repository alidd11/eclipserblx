const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://eclipserblx.com";
const SITE_NAME = "Eclipse";
const DEFAULT_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/6XoLGVy9Aseup6dIxodIWS9uGsS2/social-images/social-1772684689417-IMG_0084.webp";
const DEFAULT_DESCRIPTION = "Eclipse is the best Roblox asset marketplace. Buy premium roleplay scripts, vehicles, maps and game assets. Lower fees, instant delivery.";

const STATIC_PAGES: Record<string, { title: string; description: string }> = {
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

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function buildHtml(t: string, d: string, img: string, url: string, type = "website", extra = ""): string {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"/><title>${esc(t)}</title>
<meta name="description" content="${esc(d)}"/>
<link rel="canonical" href="${esc(url)}"/>
<meta property="og:type" content="${type}"/>
<meta property="og:site_name" content="${SITE_NAME}"/>
<meta property="og:title" content="${esc(t)}"/>
<meta property="og:description" content="${esc(d)}"/>
<meta property="og:image" content="${esc(img)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:url" content="${esc(url)}"/>
${extra}
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:site" content="@EclipseRblx"/>
<meta name="twitter:title" content="${esc(t)}"/>
<meta name="twitter:description" content="${esc(d)}"/>
<meta name="twitter:image" content="${esc(img)}"/>
<meta http-equiv="refresh" content="0;url=${esc(url)}"/>
</head><body><p>Redirecting to <a href="${esc(url)}">${esc(t)}</a>…</p></body></html>`;
}

async function resolveStoreByHostname(hostname: string): Promise<any> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Look up store_domains for this hostname
  const domainRes = await fetch(
    `${url}/rest/v1/store_domains?select=store_id&domain=eq.${encodeURIComponent(hostname)}&status=eq.active&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
    }
  );
  if (!domainRes.ok) { await domainRes.text(); return null; }
  const domains = await domainRes.json();
  if (!domains?.length) return null;

  const storeId = domains[0].store_id;
  // Fetch store details
  const storeRes = await fetch(
    `${url}/rest/v1/stores?select=id,name,description,logo_url,banner_url,slug,product_count&id=eq.${storeId}&is_active=eq.true`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/vnd.pgrst.object+json",
      },
    }
  );
  if (!storeRes.ok) { await storeRes.text(); return null; }
  return storeRes.json();
}

async function pgQuery(table: string, select: string, filters: string): Promise<any> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${url}/rest/v1/${table}?select=${encodeURIComponent(select)}&${filters}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/vnd.pgrst.object+json",
    },
  });
  if (!res.ok) { await res.text(); return null; }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const u = new URL(req.url);
  const path = u.searchParams.get("path") || "/";
  const hostname = u.searchParams.get("hostname");

  // --- Store subdomain / custom domain OG ---
  if (hostname) {
    const store = await resolveStoreByHostname(hostname);
    if (store) {
      const storeUrl = `https://${hostname}${path}`;
      const desc = store.description
        ? store.description.replace(/<[^>]*>/g, "").slice(0, 200)
        : `Browse ${store.name}'s products on Eclipse — ${store.product_count || 0} items available.`;
      const img = store.banner_url || store.logo_url || DEFAULT_IMAGE;

      // If path matches a product number, try to serve product-level OG
      const pm = path.match(/^\/products\/(\d+)$/);
      if (pm) {
        const product = await pgQuery("products", "name,description,images,price,product_number,store_id", `product_number=eq.${pm[1]}&store_id=eq.${store.id}&is_active=eq.true`);
        if (product) {
          const pDesc = product.description ? product.description.replace(/<[^>]*>/g, "").slice(0, 200) : `Check out ${product.name} on ${store.name}`;
          const pImg = product.images?.[0] || img;
          const priceExtra = product.price != null ? `<meta property="product:price:amount" content="${product.price}"/><meta property="product:price:currency" content="GBP"/>` : "";
          return new Response(buildHtml(`${product.name} | ${store.name}`, pDesc, pImg, storeUrl, "product", priceExtra), {
            headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300", ...corsHeaders },
          });
        }
      }

      // Default: store-level OG
      return new Response(buildHtml(`${store.name} | ${SITE_NAME}`, desc, img, storeUrl, "profile"), {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600", ...corsHeaders },
      });
    }
    // Unknown hostname — redirect to main site
    return new Response(null, { status: 302, headers: { Location: `${SITE_URL}${path}`, ...corsHeaders } });
  }

  // Static pages
  const s = STATIC_PAGES[path];
  if (s) {
    return new Response(buildHtml(s.title, s.description, DEFAULT_IMAGE, `${SITE_URL}${path}`), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600", ...corsHeaders },
    });
  }

  // Product pages — now numeric: /products/12345
  const pm = path.match(/^\/products\/(\d+)$/);
  if (pm) {
    const productNumber = pm[1];
    const product = await pgQuery("products", "name,description,images,price,product_number,stores(name)", `product_number=eq.${productNumber}&is_active=eq.true`);
    const pageUrl = `${SITE_URL}/products/${encodeURIComponent(productNumber)}`;
    if (!product) return new Response(null, { status: 302, headers: { Location: pageUrl, ...corsHeaders } });

    const storeName = product.stores?.name;
    const rawDesc = product.description ? product.description.replace(/<[^>]*>/g, "").slice(0, 200) : `Check out ${product.name} on Eclipse`;
    const desc = storeName ? `By ${storeName} — ${rawDesc}` : rawDesc;
    const img = product.images?.[0] || DEFAULT_IMAGE;
    const priceExtra = product.price != null ? `<meta property="product:price:amount" content="${product.price}"/><meta property="product:price:currency" content="GBP"/>` : "";

    return new Response(buildHtml(`${product.name} | ${SITE_NAME}`, desc, img, pageUrl, "product", priceExtra), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300", ...corsHeaders },
    });
  }

  // Legacy slug-based product pages: /products/my-product-slug
  const slugPm = path.match(/^\/products\/([a-zA-Z][a-zA-Z0-9\-_]{0,200})$/);
  if (slugPm) {
    const slugVal = slugPm[1];
    const product = await pgQuery("products", "name,description,images,price,product_number,stores(name)", `slug=eq.${slugVal}&is_active=eq.true`);
    if (product) {
      const canonicalUrl = product.product_number ? `${SITE_URL}/products/${product.product_number}` : `${SITE_URL}/products/${encodeURIComponent(slugVal)}`;
      const storeName = product.stores?.name;
      const rawDesc = product.description ? product.description.replace(/<[^>]*>/g, "").slice(0, 200) : `Check out ${product.name} on Eclipse`;
      const desc = storeName ? `By ${storeName} — ${rawDesc}` : rawDesc;
      const img = product.images?.[0] || DEFAULT_IMAGE;
      const priceExtra = product.price != null ? `<meta property="product:price:amount" content="${product.price}"/><meta property="product:price:currency" content="GBP"/>` : "";

      return new Response(buildHtml(`${product.name} | ${SITE_NAME}`, desc, img, canonicalUrl, "product", priceExtra), {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300", ...corsHeaders },
      });
    }
  }

  // Store pages
  const sm = path.match(/^\/store\/([a-zA-Z0-9][a-zA-Z0-9\-_]{0,200})$/);
  if (sm) {
    const slug = sm[1];
    const store = await pgQuery("stores", "name,description,logo_url,banner_url,slug,product_count", `slug=eq.${slug}&is_active=eq.true`);
    const pageUrl = `${SITE_URL}/store/${encodeURIComponent(slug)}`;
    if (!store) return new Response(null, { status: 302, headers: { Location: pageUrl, ...corsHeaders } });

    const desc = store.description ? store.description.replace(/<[^>]*>/g, "").slice(0, 200) : `Browse ${store.name}'s products on Eclipse — ${store.product_count || 0} items available.`;
    const img = store.banner_url || store.logo_url || DEFAULT_IMAGE;

    return new Response(buildHtml(`${store.name} | ${SITE_NAME}`, desc, img, pageUrl, "profile"), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600", ...corsHeaders },
    });
  }

  return new Response(null, { status: 302, headers: { Location: `${SITE_URL}${path}`, ...corsHeaders } });
});
