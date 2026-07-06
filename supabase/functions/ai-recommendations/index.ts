import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit
  const clientIp = getClientIp(req);
  const rl = checkRateLimit({ ...RATE_LIMITS.API, identifier: clientIp, action: 'ai-recommendations' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const { userId: rawUserId, productId, limit = 6 } = await req.json();

    // Validate inputs
    if (rawUserId && (!UUID_REGEX.test(rawUserId))) {
      return new Response(
        JSON.stringify({ error: "Invalid userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (productId && (!UUID_REGEX.test(productId))) {
      return new Response(
        JSON.stringify({ error: "Invalid productId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const safeLimit = Math.min(Math.max(1, Number(limit) || 6), 20);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Only allow personalization when caller is authenticated AND their user
    // matches the requested userId. Otherwise fall back to anonymous recs.
    let userId: string | null = null;
    if (rawUserId) {
      const authHeader = req.headers.get("Authorization") || "";
      if (authHeader.toLowerCase().startsWith("bearer ")) {
        const token = authHeader.slice(7);
        const { data: userRes } = await supabase.auth.getUser(token);
        if (userRes?.user?.id === rawUserId) {
          userId = rawUserId;
        }
      }
    }

    let recommendations: any[] = [];
    let strategy = "popular";

    // Strategy 1: If user is logged in, use purchase history
    if (userId) {
      const { data: purchases } = await supabase
        .from("order_items")
        .select(`products (category_id)`)
        .eq("orders.user_id", userId)
        .limit(20);

      const { data: views } = await supabase
        .from("product_views")
        .select("product_id")
        .eq("user_id", userId)
        .order("last_viewed_at", { ascending: false })
        .limit(10);

      const viewedIds = views?.map((v) => v.product_id) || [];

      const { data: follows } = await supabase
        .from("store_follows")
        .select("store_id")
        .eq("user_id", userId);

      const followedStoreIds = follows?.map((f) => f.store_id) || [];

      if (followedStoreIds.length > 0) {
        const { data: followedProducts } = await supabase
          .from("products")
          .select("id, name, slug, price, images, store_id, categories(name), stores(name, slug, logo_url, is_verified, is_active)")
          .in("store_id", followedStoreIds)
          .eq("is_active", true)
          .eq("moderation_status", "approved")
          .order("created_at", { ascending: false })
          .limit(safeLimit * 2);

        if (followedProducts && followedProducts.length > 0) {
          const filtered = followedProducts.filter((p: any) => p.stores?.is_active === true);
          recommendations = filtered.slice(0, safeLimit);
          strategy = "followed_stores";
        }
      }

      if (recommendations.length < safeLimit && viewedIds.length > 0) {
        const { data: viewedProducts } = await supabase
          .from("products")
          .select("id, name, slug, price, images, category_id, categories(name)")
          .in("id", viewedIds)
          .limit(5);

        const categoryIds = [...new Set(viewedProducts?.map((p) => p.category_id).filter(Boolean))];

        if (categoryIds.length > 0) {
          const { data: similarProducts } = await supabase
            .from("products")
            .select("id, name, slug, price, images, store_id, categories(name), stores(name, slug, logo_url, is_verified, is_active)")
            .in("category_id", categoryIds)
            .not("id", "in", `(${viewedIds.join(",")})`)
            .eq("is_active", true)
            .eq("moderation_status", "approved")
            .order("download_count", { ascending: false })
            .limit((safeLimit - recommendations.length) * 2);

          if (similarProducts) {
            const filtered = similarProducts.filter((p: any) => p.stores?.is_active === true);
            recommendations = [...recommendations, ...filtered.slice(0, safeLimit - recommendations.length)];
            strategy = recommendations.length > followedStoreIds.length ? "similar_categories" : strategy;
          }
        }
      }
    }

    // Strategy 2: If viewing a specific product, find similar
    if (productId && recommendations.length < safeLimit) {
      const { data: product } = await supabase
        .from("products")
        .select("category_id, store_id, price")
        .eq("id", productId)
        .single();

      if (product) {
        const { data: similar } = await supabase
          .from("products")
          .select("id, name, slug, price, images, store_id, categories(name), stores(name, slug, logo_url, is_verified, is_active)")
          .eq("category_id", product.category_id)
          .neq("id", productId)
          .eq("is_active", true)
          .eq("moderation_status", "approved")
          .order("download_count", { ascending: false })
          .limit((safeLimit - recommendations.length) * 2);

        if (similar) {
          const filtered = similar.filter((p: any) => p.stores?.is_active === true);
          recommendations = [...recommendations, ...filtered.slice(0, safeLimit - recommendations.length)];
          strategy = "similar_products";
        }
      }
    }

    // Strategy 3: Fall back to popular products
    if (recommendations.length < safeLimit) {
      const existingIds = recommendations.map((r) => r.id);
      
      const { data: popular } = await supabase
        .from("products")
        .select("id, name, slug, price, images, store_id, categories(name), stores(name, slug, logo_url, is_verified, is_active)")
        .eq("is_active", true)
        .eq("moderation_status", "approved")
        .order("download_count", { ascending: false })
        .limit((safeLimit - recommendations.length) * 2);

      if (popular) {
        const filtered = popular.filter((p: any) => p.stores?.is_active === true);
        const withoutDupes = filtered.filter((p: any) => !existingIds.includes(p.id));
        recommendations = [...recommendations, ...withoutDupes.slice(0, safeLimit - recommendations.length)];
      }
    }

    // Deduplicate
    const seen = new Set();
    recommendations = recommendations.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    }).slice(0, safeLimit);

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
      JSON.stringify({ error: "Failed to get recommendations" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
