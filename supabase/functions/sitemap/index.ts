import { handleCors } from "../_shared/edge-response.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const SITE = "https://eclipserblx.com";

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Fetch in parallel
    const [productsRes, categoriesRes, storesRes] = await Promise.all([
      sb.from("products")
        .select("product_number, updated_at")
        .eq("is_active", true)
        .not("store_id", "is", null)
        .order("updated_at", { ascending: false })
        .limit(1000),
      sb.from("categories")
        .select("slug, updated_at")
        .order("display_order", { ascending: true }),
      sb.from("stores")
        .select("slug, updated_at")
        .eq("status", "approved")
        .eq("is_active", true)
        .eq("is_testing", false)
        .order("follower_count", { ascending: false })
        .limit(500),
    ]);

    const products = productsRes.data || [];
    const categories = categoriesRes.data || [];
    const stores = storesRes.data || [];

    const today = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${SITE}/products</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>${SITE}/categories</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>${SITE}/featured</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>
  <url><loc>${SITE}/stores</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>${SITE}/eclipse-plus</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>${SITE}/sell</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>
`;

    for (const cat of categories) {
      const lm = cat.updated_at ? cat.updated_at.split("T")[0] : today;
      xml += `  <url><loc>${SITE}/products?category=${cat.slug}</loc><lastmod>${lm}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;
    }

    for (const store of stores) {
      const lm = store.updated_at ? store.updated_at.split("T")[0] : today;
      xml += `  <url><loc>${SITE}/store/${store.slug}</loc><lastmod>${lm}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>\n`;
    }

    for (const p of products) {
      const lm = p.updated_at ? p.updated_at.split("T")[0] : today;
      xml += `  <url><loc>${SITE}/products/${p.product_number}</loc><lastmod>${lm}</lastmod><changefreq>weekly</changefreq><priority>0.5</priority></url>\n`;
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("Sitemap error:", e);
    return new Response("Internal error", { status: 500 });
  }
});
