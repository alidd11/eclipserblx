import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_MINUTES = 30;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit({
    ...RATE_LIMITS.WRITE,
    identifier: clientIp,
    action: 'smart-search',
  });

  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const { query, userId } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (query.length > 500) {
      return new Response(
        JSON.stringify({ error: "Query too long (max 500 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: categories } = await supabase
      .from("categories")
      .select("id, name, slug");

    // Check cache
    const cacheKey = `smart_search:${query.toLowerCase().trim()}`;
    let searchParams: {
      keywords: string[];
      category?: string;
      maxPrice?: number;
      minPrice?: number;
      sortBy?: string;
    } = { keywords: [query] };

    const { data: cached } = await supabase
      .from("ai_response_cache")
      .select("response")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      searchParams = cached.response as typeof searchParams;
    } else {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are a search query parser for a Roblox digital assets marketplace. 
Extract search parameters from natural language queries.

Available categories: ${categories?.map((c: any) => c.name).join(", ") || "Scripts, UI Kits, Models, Plugins"}

Return a JSON object with these fields:
- keywords: array of search terms (required)
- category: category slug if mentioned (optional)
- maxPrice: maximum price in dollars if mentioned (optional)
- minPrice: minimum price if mentioned (optional)
- sortBy: "price_asc", "price_desc", "newest", "popular" if mentioned (optional)`
            },
            { role: "user", content: query }
          ],
          tools: [{
            type: "function",
            function: {
              name: "parse_search_query",
              description: "Parse search query into structured parameters",
              parameters: {
                type: "object",
                properties: {
                  keywords: { type: "array", items: { type: "string" } },
                  category: { type: "string" },
                  maxPrice: { type: "number" },
                  minPrice: { type: "number" },
                  sortBy: { type: "string", enum: ["price_asc", "price_desc", "newest", "popular"] }
                },
                required: ["keywords"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "parse_search_query" } }
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded, please try again" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (aiResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI service unavailable" }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      try {
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          searchParams = JSON.parse(toolCall.function.arguments);
        }
      } catch (e) {
        console.error("Failed to parse AI response:", e);
      }

      // Cache (fire-and-forget)
      const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000).toISOString();
      supabase
        .from("ai_response_cache")
        .upsert({ cache_key: cacheKey, function_name: "smart-search", response: searchParams, expires_at: expiresAt }, { onConflict: "cache_key" })
        .then(({ error }) => { if (error) console.error("Cache write error:", error); });
    }

    // Resolve category slug
    let categorySlug: string | null = null;
    if (searchParams.category) {
      const match = categories?.find(
        (c: any) => c.name.toLowerCase().includes(searchParams.category!.toLowerCase())
      );
      if (match) categorySlug = match.slug;
    }

    // Use search_products_v2 RPC
    const { data: products, error: dbError } = await supabase.rpc('search_products_v2', {
      search_query: searchParams.keywords.join(' '),
      category_filter: categorySlug,
      min_price: searchParams.minPrice ?? null,
      max_price: searchParams.maxPrice ?? null,
      free_only: false,
      sort_by: searchParams.sortBy || 'relevance',
      page_size: 20,
      page_offset: 0,
    });

    if (dbError) {
      console.error("Database error:", dbError);
      throw dbError;
    }

    // Log search
    await supabase.from("search_logs").insert({
      user_id: userId || null,
      query: query,
      results_count: (products || []).length,
    });

    return new Response(
      JSON.stringify({
        products: (products || []).map((p: any) => ({
          ...p,
          categories: p.category_name ? { name: p.category_name } : null,
        })),
        parsedQuery: searchParams,
        originalQuery: query,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Smart search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Search failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
