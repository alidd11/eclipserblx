import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, productId, limit = 6 } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let recommendations: any[] = [];
    let strategy = "popular";

    // Strategy 1: If user is logged in, use purchase history
    if (userId) {
      // Get user's purchased categories
      const { data: purchases } = await supabase
        .from("order_items")
        .select(`
          products (category_id)
        `)
        .eq("orders.user_id", userId)
        .limit(20);

      // Get user's viewed products
      const { data: views } = await supabase
        .from("product_views")
        .select("product_id")
        .eq("user_id", userId)
        .order("last_viewed_at", { ascending: false })
        .limit(10);

      const viewedIds = views?.map((v) => v.product_id) || [];

      // Get followed stores' products
      const { data: follows } = await supabase
        .from("store_follows")
        .select("store_id")
        .eq("user_id", userId);

      const followedStoreIds = follows?.map((f) => f.store_id) || [];

      if (followedStoreIds.length > 0) {
        // Recommend from followed stores
        const { data: followedProducts } = await supabase
          .from("products")
          .select("id, name, slug, price, images, categories(name), stores(name)")
          .in("store_id", followedStoreIds)
          .eq("is_active", true)
          .eq("moderation_status", "approved")
          .order("created_at", { ascending: false })
          .limit(limit);

        if (followedProducts && followedProducts.length > 0) {
          recommendations = followedProducts;
          strategy = "followed_stores";
        }
      }

      // If not enough from followed stores, add from viewed categories
      if (recommendations.length < limit && viewedIds.length > 0) {
        const { data: viewedProducts } = await supabase
          .from("products")
          .select("id, name, slug, price, images, category_id, categories(name)")
          .in("id", viewedIds)
          .limit(5);

        const categoryIds = [...new Set(viewedProducts?.map((p) => p.category_id).filter(Boolean))];

        if (categoryIds.length > 0) {
          const { data: similarProducts } = await supabase
            .from("products")
            .select("id, name, slug, price, images, categories(name)")
            .in("category_id", categoryIds)
            .not("id", "in", `(${viewedIds.join(",")})`)
            .eq("is_active", true)
            .eq("moderation_status", "approved")
            .order("download_count", { ascending: false })
            .limit(limit - recommendations.length);

          if (similarProducts) {
            recommendations = [...recommendations, ...similarProducts];
            strategy = recommendations.length > followedStoreIds.length ? "similar_categories" : strategy;
          }
        }
      }
    }

    // Strategy 2: If viewing a specific product, find similar
    if (productId && recommendations.length < limit) {
      const { data: product } = await supabase
        .from("products")
        .select("category_id, store_id, price")
        .eq("id", productId)
        .single();

      if (product) {
        const { data: similar } = await supabase
          .from("products")
          .select("id, name, slug, price, images, categories(name)")
          .eq("category_id", product.category_id)
          .neq("id", productId)
          .eq("is_active", true)
          .eq("moderation_status", "approved")
          .order("download_count", { ascending: false })
          .limit(limit - recommendations.length);

        if (similar) {
          recommendations = [...recommendations, ...similar];
          strategy = "similar_products";
        }
      }
    }

    // Strategy 3: Fall back to popular products
    if (recommendations.length < limit) {
      const existingIds = recommendations.map((r) => r.id);
      
      const { data: popular } = await supabase
        .from("products")
        .select("id, name, slug, price, images, categories(name)")
        .eq("is_active", true)
        .eq("moderation_status", "approved")
        .order("download_count", { ascending: false })
        .limit(limit - recommendations.length);

      if (popular) {
        const filtered = popular.filter((p) => !existingIds.includes(p.id));
        recommendations = [...recommendations, ...filtered];
      }
    }

    // Deduplicate
    const seen = new Set();
    recommendations = recommendations.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    }).slice(0, limit);

    return new Response(
      JSON.stringify({
        recommendations,
        strategy,
        count: recommendations.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Recommendations error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to get recommendations" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
