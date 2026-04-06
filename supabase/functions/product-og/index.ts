import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SITE_URL = "https://eclipserblx.com";
const FALLBACK_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/6XoLGVy9Aseup6dIxodIWS9uGsS2/social-images/social-1770521924890-IMG_4300.png";
const SITE_NAME = "Eclipse";

// Validate product number: digits only
const NUMBER_REGEX = /^\d{1,20}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const productNumber = url.searchParams.get("product_number") || url.searchParams.get("slug");

  if (!productNumber || !NUMBER_REGEX.test(productNumber)) {
    return new Response("Invalid or missing product_number parameter", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: product } = await supabase
    .from("products")
    .select("name, description, images, price, product_number, stores(name)")
    .eq("product_number", Number(productNumber))
    .eq("is_active", true)
    .maybeSingle();

  const productUrl = `${SITE_URL}/products/${encodeURIComponent(productNumber)}`;

  if (!product) {
    // Redirect to the product page anyway
    return new Response(null, {
      status: 302,
      headers: { Location: productUrl, ...corsHeaders },
    });
  }

  const title = `${escapeHtml(product.name)} | ${SITE_NAME}`;
  const storeName = (product.stores as any)?.name;
  const rawDesc = product.description
    ? product.description.replace(/<[^>]*>/g, "").slice(0, 200)
    : `Check out ${product.name} on Eclipse`;
  const description = storeName
    ? `By ${escapeHtml(storeName)} — ${escapeHtml(rawDesc)}`
    : escapeHtml(rawDesc);

  // Use first product image, fall back to site default
  const ogImage = product.images?.[0] || FALLBACK_IMAGE;
  const priceFormatted = product.price != null ? `£${Number(product.price).toFixed(2)}` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />

  <!-- Open Graph -->
  <meta name="theme-color" content="#7c3aed" />
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:alt" content="${title} preview" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${escapeHtml(productUrl)}" />
  ${priceFormatted ? `<meta property="product:price:amount" content="${product.price}" />
  <meta property="product:price:currency" content="GBP" />` : ""}

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />

  <!-- Redirect humans to the real page -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(productUrl)}" />
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(productUrl)}">${escapeHtml(product.name)}</a>...</p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      ...corsHeaders,
    },
  });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
