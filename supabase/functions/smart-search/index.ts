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

    let searchParams: {
      keywords: string[];
      category?: string;
      maxPrice?: number;
      minPrice?: number;
      sortBy?: string;
    } = { keywords: [query] };
    
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        searchParams = JSON.parse(toolCall.function.arguments);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
    }

    console.log("Parsed search params:", searchParams);

    // Build the database query
    let dbQuery = supabase
      .from("products")
      .select("id, name, slug, price, images, description, created_at, download_count, categories(name)")
      .eq("is_active", true)
      .eq("moderation_status", "approved");

    // Apply keyword search
    if (searchParams.keywords && searchParams.keywords.length > 0) {
      const searchTerms = searchParams.keywords.join(" | ");
      dbQuery = dbQuery.or(`name.ilike.%${searchParams.keywords[0]}%,description.ilike.%${searchParams.keywords[0]}%`);
    }

    // Apply category filter
    if (searchParams.category) {
      const categorySearch = searchParams.category;
      const matchingCategory = categories?.find(
        (c: any) => c.name.toLowerCase().includes(categorySearch.toLowerCase())
      );
      if (matchingCategory) {
        dbQuery = dbQuery.eq("category_id", matchingCategory.id);
      }
    }

    // Apply price filters
    if (searchParams.maxPrice !== undefined) {
      dbQuery = dbQuery.lte("price", searchParams.maxPrice);
    }
    if (searchParams.minPrice !== undefined) {
      dbQuery = dbQuery.gte("price", searchParams.minPrice);
    }

    // Apply sorting
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

    // Log the search for analytics
    await supabase.from("search_logs").insert({
      user_id: userId || null,
      query: query,
      results_count: products?.length || 0,
    });

    return new Response(
      JSON.stringify({
        products: products || [],
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
