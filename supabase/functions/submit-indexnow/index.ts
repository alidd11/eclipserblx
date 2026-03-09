const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INDEXNOW_KEY = "eclipse-indexnow-key-2026";
const SITE_URL = "https://eclipserblx.com";
const INDEXNOW_ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
  "https://yandex.com/indexnow",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { urls, type } = await req.json();

    // If no specific URLs, generate from database
    let urlsToSubmit: string[] = urls || [];

    if (!urlsToSubmit.length || type === "all") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      // Fetch active product slugs
      const productsRes = await fetch(
        `${supabaseUrl}/rest/v1/products?select=slug&is_active=eq.true&moderation_status=eq.approved&limit=1000`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      const products = await productsRes.json();

      // Fetch active store slugs
      const storesRes = await fetch(
        `${supabaseUrl}/rest/v1/stores?select=slug&is_active=eq.true&limit=1000`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      const stores = await storesRes.json();

      // Static pages
      const staticPages = [
        "/", "/products", "/stores", "/categories", "/featured",
        "/eclipse-plus", "/faq", "/help-center", "/sell", "/contact",
        "/affiliate", "/advertise", "/jobs",
      ];

      urlsToSubmit = [
        ...staticPages.map((p) => `${SITE_URL}${p}`),
        ...products.map((p: any) => `${SITE_URL}/products/${p.slug}`),
        ...stores.map((s: any) => `${SITE_URL}/store/${s.slug}`),
      ];
    }

    // IndexNow accepts max 10,000 URLs per request
    const batches: string[][] = [];
    for (let i = 0; i < urlsToSubmit.length; i += 10000) {
      batches.push(urlsToSubmit.slice(i, i + 10000));
    }

    const results: any[] = [];

    for (const batch of batches) {
      const payload = {
        host: "eclipserblx.com",
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: batch,
      };

      // Submit to all IndexNow endpoints in parallel
      const submissions = await Promise.allSettled(
        INDEXNOW_ENDPOINTS.map(async (endpoint) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);
          try {
            const res = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json; charset=utf-8" },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
            const status = res.status;
            await res.text(); // consume body
            return { endpoint, status, ok: status >= 200 && status < 300 };
          } finally {
            clearTimeout(timeout);
          }
        })
      );

      results.push({
        urlCount: batch.length,
        submissions: submissions.map((s) =>
          s.status === "fulfilled" ? s.value : { error: s.reason?.message }
        ),
      });
    }

    // Ping Google to re-crawl the sitemap
    const sitemapUrl = "https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/dynamic-sitemap";
    let googlePing = { status: 0, ok: false };
    try {
      const gRes = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
      googlePing = { status: gRes.status, ok: gRes.status >= 200 && gRes.status < 300 };
      await gRes.text();
    } catch (e) {
      googlePing = { status: 0, ok: false, error: e.message } as any;
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalUrls: urlsToSubmit.length,
        results,
        googlePing,
        message: `Submitted ${urlsToSubmit.length} URLs to IndexNow + pinged Google sitemap`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "IndexNow submission failed", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
