import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://eclipserblx.com";
const SITE_NAME = "Eclipse";
const DEFAULT_OG_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/6XoLGVy9Aseup6dIxodIWS9uGsS2/social-images/social-1770521924890-IMG_4300.png";

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textOnly(s) {
  return String(s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function firstImage(images) {
  if (!Array.isArray(images)) return DEFAULT_OG_IMAGE;
  for (const url of images) {
    if (typeof url !== "string") continue;
    const lower = url.toLowerCase();
    if (!lower.endsWith(".mp4") && !lower.endsWith(".mov") && !lower.endsWith(".webm")) {
      return url;
    }
  }
  return DEFAULT_OG_IMAGE;
}

function page(meta) {
  const title = esc(meta.title);
  const description = esc(meta.description);
  const image = esc(meta.image);
  const url = esc(meta.url);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:url" content="${url}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">
  <meta name="twitter:site" content="@EclipseRblx">
  <link rel="canonical" href="${url}">
  <meta http-equiv="refresh" content="0;url=${url}">
</head>
<body><p>Redirecting to <a href="${url}">${title}</a>...</p></body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestUrl = new URL(req.url);
    const path = requestUrl.searchParams.get("path") || "/";

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(String(supabaseUrl), String(serviceKey));

    let meta = null;

    const productMatch = path.match(/^\/products\/([^/?#]+)$/);
    if (productMatch) {
      const slug = decodeURIComponent(productMatch[1]);
      const { data: product } = await supabase
        .from("products")
        .select("name, description, images, price, slug")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (product) {
        const raw = product.description ? textOnly(product.description).slice(0, 155) : `Buy ${product.name} on Eclipse marketplace`;
        const priceTag = product.price != null ? ` · £${Number(product.price).toFixed(2)}` : "";
        meta = {
          title: `${product.name}${priceTag} | ${SITE_NAME}`,
          description: raw,
          image: firstImage(product.images),
          url: `${SITE_URL}/products/${product.slug}`,
        };
      }
    }

    if (!meta) {
      meta = {
        title: "Eclipse — Roblox Asset Marketplace",
        description: "Premium Roblox asset marketplace with lower fees and instant delivery.",
        image: DEFAULT_OG_IMAGE,
        url: `${SITE_URL}${path}`,
      };
    }

    return new Response(page(meta), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=600",
      },
    });
  } catch (error) {
    console.error("og-proxy2 error", error);
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});
