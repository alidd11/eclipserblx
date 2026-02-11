import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const storeId = "b986b944-f637-4dbf-8588-471b1a5a0da7";

  // Fetch all products for this store
  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select("id, name, images")
    .eq("store_id", storeId)
    .is("deleted_at", null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: { name: string; removed: string[]; kept: number }[] = [];

  for (const product of products || []) {
    const images: string[] = product.images || [];
    if (images.length === 0) continue;

    const kept: string[] = [];
    const removed: string[] = [];

    for (const imgUrl of images) {
      try {
        // HEAD request to get content-length
        const res = await fetch(imgUrl, { method: "HEAD" });
        const contentLength = parseInt(res.headers.get("content-length") || "0", 10);
        const contentType = res.headers.get("content-type") || "";

        // ClearlyDev logo is a small square image, typically under 50KB
        // Product screenshots are typically 100KB+
        // Also check for very small PNGs (ClearlyDev text logos) under 10KB
        if (contentLength > 0 && contentLength < 50000) {
          // Small image - likely a logo. Remove it.
          removed.push(`${imgUrl} (${contentLength} bytes)`);
        } else {
          kept.push(imgUrl);
        }
      } catch (e) {
        // If we can't check, keep it
        kept.push(imgUrl);
      }
    }

    if (removed.length > 0 && kept.length > 0) {
      // Update the product with cleaned images
      await supabaseAdmin
        .from("products")
        .update({ images: kept })
        .eq("id", product.id);
    }

    results.push({ name: product.name, removed, kept: kept.length });
  }

  return new Response(JSON.stringify({ success: true, results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
