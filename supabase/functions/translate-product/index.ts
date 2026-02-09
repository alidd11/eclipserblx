import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORTED_LANGUAGES = [
  { code: "es", name: "Spanish" },
  { code: "pt", name: "Portuguese" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId } = await req.json();

    if (!productId) {
      return new Response(
        JSON.stringify({ error: "productId is required" }),
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

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, description")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Translate to all languages in one AI call
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
            content: `You are a professional translator for a Roblox digital assets marketplace. Translate the product name and description into the requested languages. Keep technical terms, brand names, and Roblox-specific terms unchanged. Preserve any HTML formatting in descriptions.`,
          },
          {
            role: "user",
            content: `Translate this product into Spanish, Portuguese, French, and German.

Product Name: ${product.name}

Product Description: ${product.description || "No description"}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_translations",
              description: "Save translated product content for multiple languages",
              parameters: {
                type: "object",
                properties: {
                  translations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        language_code: {
                          type: "string",
                          enum: ["es", "pt", "fr", "de"],
                        },
                        translated_name: { type: "string" },
                        translated_description: { type: "string" },
                      },
                      required: ["language_code", "translated_name", "translated_description"],
                    },
                  },
                },
                required: ["translations"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_translations" } },
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
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("Failed to get translations from AI");
    }

    const { translations } = JSON.parse(toolCall.function.arguments);

    // Upsert translations into the database
    const upsertPromises = translations.map((t: any) =>
      supabase
        .from("product_translations")
        .upsert(
          {
            product_id: productId,
            language_code: t.language_code,
            translated_name: t.translated_name,
            translated_description: t.translated_description,
          },
          { onConflict: "product_id,language_code" }
        )
    );

    await Promise.all(upsertPromises);

    console.log(`Translated product ${productId} into ${translations.length} languages`);

    return new Response(
      JSON.stringify({ success: true, translated: translations.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Translation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
