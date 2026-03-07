import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://eclipserblx.com";
const DEFAULT_OG_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/6XoLGVy9Aseup6dIxodIWS9uGsS2/social-images/social-1770521924890-IMG_4300.png";
const SITE_NAME = "Eclipse";

interface PageMeta {
  title: string;
  description: string;
  image: string;
  url: string;
}

const STATIC_META: Record<string, Partial<PageMeta>> = {
  "/": {
    title: "Eclipse — Roblox Asset Marketplace",
    description: "Premium UK Roleplay Assets marketplace for Roblox. Lower fees, instant delivery.",
  },
  "/products": {
    title: "Browse Products | Eclipse",
    description: "Browse premium Roblox scripts, vehicles, maps and game assets on Eclipse marketplace.",
  },
  "/stores": {
    title: "All Stores | Eclipse",
    description: "Discover trusted stores selling Roblox assets on Eclipse.",
  },
  "/categories": {
    title: "Categories | Eclipse",
    description: "Browse Roblox assets by category — vehicles, scripts, maps, bots and more.",
  },
  "/featured": {
    title: "Featured Products | Eclipse",
    description: "Hand-picked premium Roblox assets on Eclipse marketplace.",
  },
  "/eclipse-plus": {
    title: "Eclipse+ Membership | Eclipse",
    description: "Get exclusive discounts, free claims, and premium perks with Eclipse+ membership.",
  },
  "/faq": {
    title: "FAQ | Eclipse",
    description: "Frequently asked questions about buying, selling, and using Eclipse marketplace.",
  },
  "/help-center": {
    title: "Help Center | Eclipse",
    description: "Get help with purchases, downloads, payments, refunds, and account security.",
  },
  "/sell": {
    title: "Start Selling | Eclipse",
    description: "Open your store on Eclipse marketplace. Lower fees, instant payouts, growing community.",
  },
  "/contact": {
    title: "Contact Us | Eclipse",
    description: "Get in touch with the Eclipse team for support, partnerships, or feedback.",
  },
  "/affiliate": {
    title: "Affiliate Programme | Eclipse",
    description: "Earn commission by referring new users to Eclipse marketplace.",
  },
  "/advertise": {
    title: "Advertise | Eclipse",
    description: "Promote your Roblox products to thousands of active buyers on Eclipse.",
  },
  "/jobs": {
    title: "Careers | Eclipse",
    description: "Join the Eclipse team. View open positions and apply today.",
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function pickPreviewImage(images: unknown): string {
  if (!Array.isArray(images)) return DEFAULT_OG_IMAGE;

  const firstImage = images.find((item) => {
    if (typeof item !== "string") return false;
    const lower = item.toLowerCase();
    return !(lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm"));
  });

  return typeof firstImage === "string" ? firstImage : DEFAULT_OG_IMAGE;
}

function buildHtml(meta: PageMeta): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const image = escapeHtml(meta.image);
  const url = escapeHtml(meta.url);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${url}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
  <meta name="twitter:site" content="@EclipseRblx" />
  <link rel="canonical" href="${url}" />
  <meta http-equiv="refresh" content="0;url=${url}" />
</head>
<body>
  <p>Redirecting to <a href="${url}">${title}</a>...</p>
</body>
</html>`;
}

async function getProductMeta(slug: string, supabase: ReturnType<typeof createClient>): Promise<PageMeta | null> {
  const { data: product, error } = await supabase
    .from("products")
    .select("name, description, images, price, slug, store_id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !product) return null;

  let storeName: string | null = null;
  if (product.store_id) {
    const { data: store } = await supabase
      .from("stores")
      .select("name")
      .eq("id", product.store_id)
      .maybeSingle();

    storeName = store?.name ?? null;
  }

  const cleanDescription = product.description
    ? stripHtml(product.description).slice(0, 155)
    : `Buy ${product.name} on Eclipse marketplace`;

  const description = storeName
    ? `By ${storeName} — ${cleanDescription}`
    : cleanDescription;

  const priceTag = product.price != null ? ` · £${Number(product.price).toFixed(2)}` : "";

  return {
    title: `${product.name}${priceTag} | ${SITE_NAME}`,
    description,
    image: pickPreviewImage(product.images),
    url: `${SITE_URL}/products/${product.slug}`,
  };
}

async function getStoreMeta(slug: string, supabase: ReturnType<typeof createClient>): Promise<PageMeta | null> {
  const { data: store, error } = await supabase
    .from("stores")
    .select("name, description, logo_url, slug")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !store) return null;

  return {
    title: `${store.name} | ${SITE_NAME}`,
    description: (store.description ? stripHtml(store.description) : `${store.name} on Eclipse marketplace`).slice(0, 155),
    image: store.logo_url || DEFAULT_OG_IMAGE,
    url: `${SITE_URL}/store/${store.slug}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestUrl = new URL(req.url);
    const path = requestUrl.searchParams.get("path") || "/";

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response("Missing server configuration", { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let meta: PageMeta | null = null;

    const productMatch = path.match(/^\/products\/([^/?#]+)$/);
    if (productMatch) {
      meta = await getProductMeta(decodeURIComponent(productMatch[1]), supabase);
    }

    if (!meta) {
      const storeMatch = path.match(/^\/store\/([^/?#]+)$/);
      if (storeMatch) {
        meta = await getStoreMeta(decodeURIComponent(storeMatch[1]), supabase);
      }
    }

    if (!meta) {
      const staticPage = STATIC_META[path];
      meta = {
        title: staticPage?.title || "Eclipse — Roblox Asset Marketplace",
        description:
          staticPage?.description ||
          "Premium Roblox asset marketplace with lower fees and instant delivery.",
        image: DEFAULT_OG_IMAGE,
        url: `${SITE_URL}${path}`,
      };
    }

    return new Response(buildHtml(meta), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=600",
      },
    });
  } catch (error) {
    console.error("og-proxy error", error);
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});
