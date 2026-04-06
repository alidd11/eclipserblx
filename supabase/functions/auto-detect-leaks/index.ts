import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LEAK_SITES = [
  "v3rmillion.net",
  "robloxscripts.com",
  "pastebin.com",
  "scriptblox.com",
  "rscripts.net",
  "github.com",
];

const MAX_PRODUCTS_PER_STORE = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (!firecrawlKey) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get stores with leak_scan_enabled and active Pro subscription
    const { data: stores, error: storesErr } = await supabase
      .from("stores")
      .select("id, owner_id, store_name")
      .eq("leak_scan_enabled", true);

    if (storesErr) throw storesErr;
    if (!stores?.length) {
      console.log("No stores with leak scanning enabled");
      return new Response(
        JSON.stringify({ message: "No stores to scan", scanned: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check Pro subscription for each store owner
    const proStores: typeof stores = [];
    for (const store of stores) {
      const { data: sub } = await supabase
        .from("seller_subscriptions")
        .select("id")
        .eq("seller_id", store.owner_id)
        .eq("status", "active")
        .eq("plan_type", "pro")
        .maybeSingle();

      if (sub) proStores.push(store);
    }

    if (!proStores.length) {
      console.log("No Pro stores with leak scanning enabled");
      return new Response(
        JSON.stringify({ message: "No Pro stores to scan", scanned: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalNewResults = 0;

    for (const store of proStores) {
      // Get active products for this store
      const { data: products } = await supabase
        .from("products")
        .select("id, name")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(MAX_PRODUCTS_PER_STORE);

      if (!products?.length) continue;

      for (const product of products) {
        const siteQuery = LEAK_SITES.map((s) => `site:${s}`).join(" OR ");
        const query = `"${product.name}" (${siteQuery})`;

        try {
          const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query,
              limit: 5,
            }),
          });

          if (!searchRes.ok) {
            const errBody = await searchRes.text();
            console.error(`Firecrawl search failed for "${product.name}": ${searchRes.status} ${errBody}`);
            continue;
          }

          const searchData = await searchRes.json();
          const results = searchData.data || [];

          for (const result of results) {
            if (!result.url) continue;

            const domain = new URL(result.url).hostname.replace(/^www\./, "");
            const snippet = result.description || result.title || "";

            // Deduplicate — insert only if not already exists
            const { error: insertErr } = await supabase
              .from("leak_scan_results")
              .insert({
                store_id: store.id,
                product_id: product.id,
                source_url: result.url,
                source_domain: domain,
                matched_query: query,
                snippet: snippet.substring(0, 500),
                confidence: "medium",
              });

            if (insertErr) {
              // Unique constraint violation = duplicate, skip
              if (insertErr.code === "23505") continue;
              console.error("Insert error:", insertErr.message);
              continue;
            }

            totalNewResults++;

            // Create notification for seller
            await supabase.from("seller_notifications").insert({
              user_id: store.owner_id,
              type: "leak_detected",
              title: `Potential leak detected: ${product.name}`,
              message: `Found on ${domain}: ${snippet.substring(0, 100)}`,
              action_url: "/seller/security",
            });
          }

          // Rate limit: small delay between products
          await new Promise((r) => setTimeout(r, 1000));
        } catch (searchErr) {
          console.error(`Search error for "${product.name}":`, searchErr);
        }
      }
    }

    console.log(`Scan complete. ${totalNewResults} new results found across ${proStores.length} stores.`);

    return new Response(
      JSON.stringify({
        message: "Scan complete",
        storesScanned: proStores.length,
        newResults: totalNewResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Auto-detect-leaks error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
