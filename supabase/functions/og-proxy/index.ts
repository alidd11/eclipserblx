const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://eclipserblx.com";
const SITE_NAME = "Eclipse";
const BRAND_COLOR = "#7c3aed";
const DEFAULT_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/6XoLGVy9Aseup6dIxodIWS9uGsS2/social-images/social-1772684689417-IMG_0084.webp";
const DEFAULT_DESCRIPTION = "Eclipse is the best Roblox asset marketplace. Buy premium roleplay scripts, vehicles, maps and game assets. Lower fees, instant delivery.";

const STATIC_PAGES: Record<string, { title: string; description: string }> = {
  "/": { title: "Eclipse | Roblox Marketplace — Premium Assets, Lower Fees", description: DEFAULT_DESCRIPTION },
  "/products": { title: "Browse Products | Eclipse", description: "Browse hundreds of premium Roblox assets including scripts, vehicles, maps and more on Eclipse." },
  "/stores": { title: "Browse Stores | Eclipse", description: "Discover verified Roblox asset stores on Eclipse marketplace." },
  "/categories": { title: "Categories | Eclipse", description: "Browse Roblox assets by category — scripts, vehicles, maps, tools and more." },
  "/featured": { title: "Featured Products | Eclipse", description: "Hand-picked featured Roblox assets and top sellers on Eclipse." },
  "/faq": { title: "FAQ | Eclipse", description: "Frequently asked questions about buying, selling and using Eclipse marketplace." },
  "/help-center": { title: "Help Centre | Eclipse", description: "Get help with your Eclipse account, orders, and more." },
  "/sell": { title: "Start Selling on Eclipse", description: "Sell your Roblox creations on Eclipse — lower fees, fast payouts, and a growing community." },
  "/contact": { title: "Contact Us | Eclipse", description: "Get in touch with the Eclipse team for support or enquiries." },
  "/affiliate": { title: "Affiliate Programme | Eclipse", description: "Earn commission by referring creators and buyers to Eclipse." },
  "/advertise": { title: "Advertise on Eclipse", description: "Promote your Roblox products to thousands of active buyers on Eclipse." },
  "/jobs": { title: "Jobs | Eclipse", description: "Join the Eclipse team — we're hiring passionate people to build the future of Roblox commerce." },
};

// Route-based cache durations (seconds)
const CACHE_DURATIONS: Record<string, { maxAge: number; swr: number }> = {
  "/": { maxAge: 60, swr: 30 },
  "/products": { maxAge: 120, swr: 60 },
  "/stores": { maxAge: 120, swr: 60 },
  "/categories": { maxAge: 120, swr: 60 },
  "/featured": { maxAge: 120, swr: 60 },
};

function getCacheHeader(path: string): string {
  // Product pages
  if (path.startsWith("/products/")) return "public, max-age=300, stale-while-revalidate=60";
  // Store pages
  if (path.startsWith("/store/")) return "public, max-age=600, stale-while-revalidate=120";
  // Category sub-pages
  if (path.startsWith("/categories/")) return "public, max-age=120, stale-while-revalidate=60";
  // Known routes
  const known = CACHE_DURATIONS[path];
  if (known) return `public, max-age=${known.maxAge}, stale-while-revalidate=${known.swr}`;
  // Static pages
  if (STATIC_PAGES[path]) return "public, max-age=3600, stale-while-revalidate=300";
  return "public, max-age=60, stale-while-revalidate=30";
}

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Shared nav links for the static HTML shell
const NAV_HTML = `<nav aria-label="Main navigation"><ul>
<li><a href="${SITE_URL}/products">Browse Products</a></li>
<li><a href="${SITE_URL}/stores">Browse Stores</a></li>
<li><a href="${SITE_URL}/categories">Categories</a></li>
<li><a href="${SITE_URL}/featured">Featured</a></li>
<li><a href="${SITE_URL}/sell">Start Selling</a></li>
<li><a href="${SITE_URL}/help-center">Help Centre</a></li>
<li><a href="${SITE_URL}/contact">Contact</a></li>
</ul></nav>`;

function buildOembedUrl(pageUrl: string): string {
  const base = Deno.env.get("SUPABASE_URL") || "";
  return `${base}/functions/v1/og-proxy?format=oembed&url=${encodeURIComponent(pageUrl)}`;
}

function buildHtml(t: string, d: string, img: string, url: string, type = "website", extra = "", bodyContent = "", authorName?: string): string {
  const jsonLd = type === "product" ? "" : `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": SITE_NAME,
    "url": SITE_URL,
    "description": DEFAULT_DESCRIPTION,
    "potentialAction": { "@type": "SearchAction", "target": `${SITE_URL}/products?q={search_term_string}`, "query-input": "required name=search_term_string" }
  })}</script>`;

  const oembedUrl = buildOembedUrl(url);

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"/><title>${esc(t)}</title>
<meta name="description" content="${esc(d)}"/>
<link rel="canonical" href="${esc(url)}"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="theme-color" content="${BRAND_COLOR}"/>
<meta property="og:type" content="${type}"/>
<meta property="og:site_name" content="${SITE_NAME}"/>
<meta property="og:title" content="${esc(t)}"/>
<meta property="og:description" content="${esc(d)}"/>
<meta property="og:image" content="${esc(img)}"/>
<meta property="og:image:alt" content="${esc(t)} preview"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:url" content="${esc(url)}"/>
<link rel="alternate" type="application/json+oembed" href="${esc(oembedUrl)}" title="${esc(t)}"/>
${extra}
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:site" content="@EclipseRblx"/>
<meta name="twitter:title" content="${esc(t)}"/>
<meta name="twitter:description" content="${esc(d)}"/>
<meta name="twitter:image" content="${esc(img)}"/>
${jsonLd}
<style>body{font-family:system-ui,sans-serif;background:#0f1012;color:#edeeef;margin:0;padding:20px}a{color:#7c8aff}h1{font-size:1.5rem}nav ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:12px}img{max-width:100%;height:auto;border-radius:8px}.product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}.price{font-size:1.25rem;font-weight:700;color:#7c8aff}</style>
<meta http-equiv="refresh" content="0;url=${esc(url)}"/>
</head><body>
<header><h1><a href="${SITE_URL}">${SITE_NAME}</a></h1>${NAV_HTML}</header>
<main>${bodyContent || `<p>${esc(d)}</p>`}</main>
<footer><p>&copy; ${new Date().getFullYear()} Eclipse. All rights reserved.</p></footer>
</body></html>`;
}

function buildProductBody(product: any, storeName?: string): string {
  const name = esc(product.name || "Product");
  const desc = product.description ? esc(product.description.replace(/<[^>]*>/g, "").slice(0, 500)) : "";
  const price = product.price != null ? `<p class="price">\u00A3${Number(product.price).toFixed(2)}</p>` : "";
  const store = storeName ? `<p>By <strong>${esc(storeName)}</strong></p>` : "";
  const img = product.images?.[0] ? `<img src="${esc(product.images[0])}" alt="${name}" width="600" height="400" loading="eager"/>` : "";
  return `<article><h2>${name}</h2>${store}${price}${img}<p>${desc}</p></article>`;
}

function buildStoreBody(store: any): string {
  const name = esc(store.name || "Store");
  const desc = store.description ? esc(store.description.replace(/<[^>]*>/g, "").slice(0, 500)) : "";
  const count = store.product_count || 0;
  const logo = store.logo_url ? `<img src="${esc(store.logo_url)}" alt="${name} logo" width="128" height="128"/>` : "";
  return `<article>${logo}<h2>${name}</h2><p>${desc}</p><p>${count} products available</p></article>`;
}

function buildProductJsonLd(product: any, url: string, storeName?: string): string {
  const ld: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "url": url,
    "description": product.description ? product.description.replace(/<[^>]*>/g, "").slice(0, 500) : undefined,
    "image": product.images?.[0],
  };
  if (storeName) ld.brand = { "@type": "Brand", "name": storeName };
  if (product.price != null) {
    ld.offers = {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": "GBP",
      "availability": "https://schema.org/InStock",
      "url": url,
    };
  }
  return `<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
}

function buildBreadcrumbLd(items: { name: string; url: string }[]): string {
  return `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "item": item.url,
    })),
  })}</script>`;
}

async function resolveStoreByHostname(hostname: string): Promise<any> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const domainRes = await fetch(
    `${url}/rest/v1/store_domains?select=store_id&domain=eq.${encodeURIComponent(hostname)}&status=eq.active&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" } }
  );
  if (!domainRes.ok) { await domainRes.text(); return null; }
  const domains = await domainRes.json();
  if (!domains?.length) return null;

  const storeRes = await fetch(
    `${url}/rest/v1/stores?select=id,name,description,logo_url,banner_url,slug,product_count&id=eq.${domains[0].store_id}&is_active=eq.true`,
    { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/vnd.pgrst.object+json" } }
  );
  if (!storeRes.ok) { await storeRes.text(); return null; }
  return storeRes.json();
}

async function pgQuery(table: string, select: string, filters: string): Promise<any> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${url}/rest/v1/${table}?select=${encodeURIComponent(select)}&${filters}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/vnd.pgrst.object+json" },
  });
  if (!res.ok) { await res.text(); return null; }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const u = new URL(req.url);

  // --- oEmbed JSON endpoint ---
  if (u.searchParams.get("format") === "oembed") {
    const pageUrl = u.searchParams.get("url") || SITE_URL;
    const oembed = {
      version: "1.0",
      type: "link",
      provider_name: "Eclipse Marketplace",
      provider_url: SITE_URL,
      title: SITE_NAME,
      url: pageUrl,
    };
    return new Response(JSON.stringify(oembed), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=3600", ...corsHeaders },
    });
  }

  const path = u.searchParams.get("path") || "/";
  const hostname = u.searchParams.get("hostname");

  // --- Store subdomain / custom domain OG ---
  if (hostname) {
    const store = await resolveStoreByHostname(hostname);
    if (store) {
      const storeUrl = `https://${hostname}${path}`;
      const desc = store.description
        ? store.description.replace(/<[^>]*>/g, "").slice(0, 200)
        : `Browse ${store.name}'s products on Eclipse \u2014 ${store.product_count || 0} items available.`;
      const img = store.banner_url || store.logo_url || DEFAULT_IMAGE;

      const pm = path.match(/^\/products\/(\d+)$/);
      if (pm) {
        const product = await pgQuery("products", "name,description,images,price,product_number,store_id", `product_number=eq.${pm[1]}&store_id=eq.${store.id}&is_active=eq.true`);
        if (product) {
          const pDesc = product.description ? product.description.replace(/<[^>]*>/g, "").slice(0, 200) : `Check out ${product.name} on ${store.name}`;
          const pImg = product.images?.[0] || img;
          const priceExtra = product.price != null ? `<meta property="product:price:amount" content="${product.price}"/><meta property="product:price:currency" content="GBP"/>` : "";
          const body = buildProductBody(product, store.name);
          const jsonLd = buildProductJsonLd(product, storeUrl, store.name);
          return new Response(buildHtml(`${product.name} | ${store.name}`, pDesc, pImg, storeUrl, "product", priceExtra + jsonLd, body), {
            headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": getCacheHeader(path), ...corsHeaders },
          });
        }
      }

      const body = buildStoreBody(store);
      return new Response(buildHtml(`${store.name} | ${SITE_NAME}`, desc, img, storeUrl, "profile", "", body), {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": getCacheHeader("/store/x"), ...corsHeaders },
      });
    }
    return new Response(null, { status: 302, headers: { Location: `${SITE_URL}${path}`, ...corsHeaders } });
  }

  // Static pages
  const s = STATIC_PAGES[path];
  if (s) {
    return new Response(buildHtml(s.title, s.description, DEFAULT_IMAGE, `${SITE_URL}${path}`), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": getCacheHeader(path), ...corsHeaders },
    });
  }

  // Category pages — /categories/:slug
  const catMatch = path.match(/^\/categories\/([a-zA-Z0-9][a-zA-Z0-9\-_]{0,200})$/);
  if (catMatch) {
    const catSlug = catMatch[1];
    const category = await pgQuery("categories", "id,name,description,slug", `slug=eq.${catSlug}`);
    const pageUrl = `${SITE_URL}/categories/${encodeURIComponent(catSlug)}`;
    if (!category) return new Response(null, { status: 302, headers: { Location: pageUrl, ...corsHeaders } });

    // Fetch top products in this category
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    let categoryProducts: any[] = [];
    try {
      const prodRes = await fetch(
        `${url}/rest/v1/products?select=name,price,images,product_number,stores(name)&category_id=eq.${category.id}&is_active=eq.true&order=created_at.desc&limit=8`,
        { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" } }
      );
      if (prodRes.ok) categoryProducts = await prodRes.json();
      else await prodRes.text();
    } catch {}

    const catDesc = category.description
      ? category.description.replace(/<[^>]*>/g, "").slice(0, 200)
      : `Browse ${category.name} assets on Eclipse — premium Roblox products at lower fees.`;

    // Build product grid HTML for crawlers
    let productGridHtml = "";
    if (categoryProducts.length > 0) {
      productGridHtml = `<div class="product-grid">${categoryProducts.map(p => {
        const pImg = p.images?.[0] ? `<img src="${esc(p.images[0])}" alt="${esc(p.name)}" width="200" height="150" loading="lazy"/>` : "";
        const pPrice = p.price != null ? `<p class="price">\u00A3${Number(p.price).toFixed(2)}</p>` : "";
        const pLink = p.product_number ? `${SITE_URL}/products/${p.product_number}` : "#";
        return `<a href="${esc(pLink)}" style="text-decoration:none;color:inherit"><article>${pImg}<h3>${esc(p.name)}</h3>${pPrice}</article></a>`;
      }).join("")}</div>`;
    }

    const body = `<h2>${esc(category.name)}</h2><p>${esc(catDesc)}</p>${productGridHtml}`;

    // ItemList JSON-LD
    const itemListLd: any = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": category.name,
      "url": pageUrl,
      "numberOfItems": categoryProducts.length,
      "itemListElement": categoryProducts.map((p, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "name": p.name,
        "url": p.product_number ? `${SITE_URL}/products/${p.product_number}` : pageUrl,
      })),
    };

    // Breadcrumb JSON-LD
    const breadcrumbLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
        { "@type": "ListItem", "position": 2, "name": "Categories", "item": `${SITE_URL}/categories` },
        { "@type": "ListItem", "position": 3, "name": category.name, "item": pageUrl },
      ],
    };

    const extra = `<script type="application/ld+json">${JSON.stringify(itemListLd)}</script><script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>`;

    return new Response(buildHtml(`${category.name} | ${SITE_NAME}`, catDesc, DEFAULT_IMAGE, pageUrl, "website", extra, body), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=120, stale-while-revalidate=60", ...corsHeaders },
    });
  }

  // Product pages — numeric: /products/12345
  const pm = path.match(/^\/products\/(\d+)$/);
  if (pm) {
    const productNumber = pm[1];
    const product = await pgQuery("products", "name,description,images,price,product_number,stores(name)", `product_number=eq.${productNumber}&is_active=eq.true`);
    const pageUrl = `${SITE_URL}/products/${encodeURIComponent(productNumber)}`;
    if (!product) return new Response(null, { status: 302, headers: { Location: pageUrl, ...corsHeaders } });

    const storeName = product.stores?.name;
    const rawDesc = product.description ? product.description.replace(/<[^>]*>/g, "").slice(0, 200) : `Check out ${product.name} on Eclipse`;
    const desc = storeName ? `By ${storeName} \u2014 ${rawDesc}` : rawDesc;
    const img = product.images?.[0] || DEFAULT_IMAGE;
    const priceExtra = product.price != null ? `<meta property="product:price:amount" content="${product.price}"/><meta property="product:price:currency" content="GBP"/>` : "";
    const body = buildProductBody(product, storeName);
    const jsonLd = buildProductJsonLd(product, pageUrl, storeName);
    const breadcrumb = buildBreadcrumbLd([
      { name: "Home", url: SITE_URL },
      { name: "Products", url: `${SITE_URL}/products` },
      { name: product.name, url: pageUrl },
    ]);

    return new Response(buildHtml(`${product.name} | ${SITE_NAME}`, desc, img, pageUrl, "product", priceExtra + jsonLd + breadcrumb, body), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": getCacheHeader(path), ...corsHeaders },
    });
  }

  // Legacy slug-based product pages
  const slugPm = path.match(/^\/products\/([a-zA-Z][a-zA-Z0-9\-_]{0,200})$/);
  if (slugPm) {
    const slugVal = slugPm[1];
    const product = await pgQuery("products", "name,description,images,price,product_number,stores(name)", `slug=eq.${slugVal}&is_active=eq.true`);
    if (product) {
      const canonicalUrl = product.product_number ? `${SITE_URL}/products/${product.product_number}` : `${SITE_URL}/products/${encodeURIComponent(slugVal)}`;
      const storeName = product.stores?.name;
      const rawDesc = product.description ? product.description.replace(/<[^>]*>/g, "").slice(0, 200) : `Check out ${product.name} on Eclipse`;
      const desc = storeName ? `By ${storeName} \u2014 ${rawDesc}` : rawDesc;
      const img = product.images?.[0] || DEFAULT_IMAGE;
      const priceExtra = product.price != null ? `<meta property="product:price:amount" content="${product.price}"/><meta property="product:price:currency" content="GBP"/>` : "";
      const body = buildProductBody(product, storeName);
      const jsonLd = buildProductJsonLd(product, canonicalUrl, storeName);

      return new Response(buildHtml(`${product.name} | ${SITE_NAME}`, desc, img, canonicalUrl, "product", priceExtra + jsonLd, body), {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": getCacheHeader("/products/1"), ...corsHeaders },
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

    const desc = store.description ? store.description.replace(/<[^>]*>/g, "").slice(0, 200) : `Browse ${store.name}'s products on Eclipse \u2014 ${store.product_count || 0} items available.`;
    const img = store.banner_url || store.logo_url || DEFAULT_IMAGE;
    const body = buildStoreBody(store);

    const storeBreadcrumb = buildBreadcrumbLd([
      { name: "Home", url: SITE_URL },
      { name: "Stores", url: `${SITE_URL}/stores` },
      { name: store.name, url: pageUrl },
    ]);

    return new Response(buildHtml(`${store.name} | ${SITE_NAME}`, desc, img, pageUrl, "profile", storeBreadcrumb, body), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": getCacheHeader(path), ...corsHeaders },
    });
  }

  return new Response(null, { status: 302, headers: { Location: `${SITE_URL}${path}`, ...corsHeaders } });
});
