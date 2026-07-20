import { requireServiceRole } from "../_shared/auth-guard.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  const _unauth = requireServiceRole(req, corsHeaders);
  if (_unauth) return _unauth;

  try {
    const { urls, type } = await req.json();

    let urlsToSubmit: string[] = urls || [];

    if (!urlsToSubmit.length || type === "all") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const productsRes = await fetch(
        `${supabaseUrl}/rest/v1/products?select=product_number&is_active=eq.true&moderation_status=eq.approved&limit=1000`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      const products = await productsRes.json();

      const storesRes = await fetch(
        `${supabaseUrl}/rest/v1/stores?select=slug&is_active=eq.true&limit=1000`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      const stores = await storesRes.json();

      const staticPages = [
        "/", "/products", "/stores", "/categories", "/featured",
        "/faq", "/help-center", "/sell", "/contact",
        "/affiliate", "/advertise", "/jobs",
      ];

      urlsToSubmit = [
        ...staticPages.map((p) => `${SITE_URL}${p}`),
        ...products.map((p: any) => `${SITE_URL}/products/${p.product_number}`),
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
            await res.text();
            return { endpoint, status, ok: status >= 200 && status < 300 };
          } finally {
            clearTimeout(timeout);
          }
        })
      );

      results.push({
        urlCount: batch.length,
        submissions: submissions.map((s) =>
          s.status === "fulfilled" ? s.value : { error: (s.reason as Error)?.message }
        ),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalUrls: urlsToSubmit.length,
        results,
        message: `Submitted ${urlsToSubmit.length} URLs to IndexNow (Bing, Yandex)`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "IndexNow submission failed", message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
