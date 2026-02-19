import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_MINUTES = 30;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userId } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch categories for context
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name, slug");

    // Check DB cache first
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
      console.log("Using DB-cached parsed query for:", cacheKey);
      searchParams = cached.response as typeof searchParams;
    } else {
      // Use AI to parse the natural language query
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
- category: category name if mentioned (optional)
- maxPrice: maximum price in dollars if mentioned (optional)
- minPrice: minimum price if mentioned (optional)
- sortBy: "price_asc", "price_desc", "newest", "popular" if mentioned (optional)

Examples:
"tycoon UI kit under $10" -> {"keywords": ["tycoon", "UI", "kit"], "maxPrice": 10}
"cheap admin scripts" -> {"keywords": ["admin", "scripts"], "sortBy": "price_asc"}
"newest models" -> {"keywords": ["models"], "sortBy": "newest"}`
            },
            {
              role: "user",
              content: query
            }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "parse_search_query",
                description: "Parse search query into structured parameters",
                parameters: {
                  type: "object",
                  properties: {
                    keywords: {
                      type: "array",
                      items: { type: "string" },
                      description: "Search keywords"
                    },
                    category: {
                      type: "string",
                      description: "Category name if specified"
                    },
                    maxPrice: {
                      type: "number",
                      description: "Maximum price in dollars"
                    },
                    minPrice: {
                      type: "number",
                      description: "Minimum price in dollars"
                    },
                    sortBy: {
                      type: "string",
                      enum: ["price_asc", "price_desc", "newest", "popular"],
                      description: "Sort order"
                    }
                  },
                  required: ["keywords"]
                }
              }
            }
          ],
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
      console.log("AI response:", JSON.stringify(aiData));

      try {
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          searchParams = JSON.parse(toolCall.function.arguments);
        }
      } catch (e) {
        console.error("Failed to parse AI response:", e);
      }

      // Cache to DB (fire-and-forget)
      const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000).toISOString();
      supabase
        .from("ai_response_cache")
        .upsert({ cache_key: cacheKey, function_name: "smart-search", response: searchParams, expires_at: expiresAt }, { onConflict: "cache_key" })
        .then(({ error }) => { if (error) console.error("Cache write error:", error); });
    }

    console.log("Parsed search params:", searchParams);

    // Sanitize keywords
    const sanitizeKeyword = (keyword: string): string => {
      if (!keyword || typeof keyword !== 'string') return '';
      return keyword.replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 100).trim();
    };

    // Build the database query
    let dbQuery = supabase
      .from("products")
      .select("id, name, slug, price, images, description, created_at, download_count, store_id, categories(name), stores(is_active)")
      .eq("is_active", true)
      .eq("moderation_status", "approved");

    if (searchParams.keywords && searchParams.keywords.length > 0) {
      const sanitizedKeyword = sanitizeKeyword(searchParams.keywords[0]);
      if (sanitizedKeyword) {
        const escapedKeyword = sanitizedKeyword.replace(/[%_]/g, '\\$&');
        dbQuery = dbQuery.or(`name.ilike.%${escapedKeyword}%,description.ilike.%${escapedKeyword}%`);
      }
    }

    if (searchParams.category) {
      const matchingCategory = categories?.find(
        (c: any) => c.name.toLowerCase().includes(searchParams.category!.toLowerCase())
      );
      if (matchingCategory) {
        dbQuery = dbQuery.eq("category_id", matchingCategory.id);
      }
    }

    if (searchParams.maxPrice !== undefined) {
      dbQuery = dbQuery.lte("price", searchParams.maxPrice);
    }
    if (searchParams.minPrice !== undefined) {
      dbQuery = dbQuery.gte("price", searchParams.minPrice);
    }

    switch (searchParams.sortBy) {
      case "price_asc":
        dbQuery = dbQuery.order("price", { ascending: true });
        break;
      case "price_desc":
        dbQuery = dbQuery.order("price", { ascending: false });
        break;
      case "newest":
        dbQuery = dbQuery.order("created_at", { ascending: false });
        break;
      case "popular":
        dbQuery = dbQuery.order("download_count", { ascending: false });
        break;
      default:
        dbQuery = dbQuery.order("created_at", { ascending: false });
    }

    dbQuery = dbQuery.limit(20);

    const { data: products, error: dbError } = await dbQuery;

    if (dbError) {
      console.error("Database error:", dbError);
      throw dbError;
    }

    const filteredProducts = (products || []).filter((p: any) => !p.stores || p.stores.is_active !== false);

    // Log the search for analytics
    await supabase.from("search_logs").insert({
      user_id: userId || null,
      query: query,
      results_count: filteredProducts.length,
    });

    return new Response(
      JSON.stringify({
        products: filteredProducts,
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
