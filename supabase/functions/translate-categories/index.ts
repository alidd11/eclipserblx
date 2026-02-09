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

    // Fetch all categories
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id, name, description")
      .order("display_order", { ascending: true });

    if (catError || !categories?.length) {
      return new Response(
        JSON.stringify({ error: "No categories found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check which categories already have translations
    const { data: existing } = await supabase
      .from("category_translations")
      .select("category_id, language_code");

    const existingSet = new Set(
      (existing || []).map((e: any) => `${e.category_id}-${e.language_code}`)
    );

    // Filter to only untranslated categories
    const needsTranslation = categories.filter((cat) =>
      ["es", "pt", "fr", "de"].some(
        (lang) => !existingSet.has(`${cat.id}-${lang}`)
      )
    );

    if (needsTranslation.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "All categories already translated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build category list for AI
    const categoryList = needsTranslation
      .map((c) => `- "${c.name}": ${c.description || "No description"}`)
      .join("\n");

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
            content: `You are a professional translator for a Roblox digital assets marketplace. Translate category names and descriptions into Spanish, Portuguese, French, and German. Keep technical terms and brand names unchanged. Keep translations concise.`,
          },
          {
            role: "user",
            content: `Translate these categories:\n\n${categoryList}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_category_translations",
              description: "Save translated category content",
              parameters: {
                type: "object",
                properties: {
                  translations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        original_name: { type: "string" },
                        language_code: { type: "string", enum: ["es", "pt", "fr", "de"] },
                        translated_name: { type: "string" },
                        translated_description: { type: "string" },
                      },
                      required: ["original_name", "language_code", "translated_name"],
                    },
                  },
                },
                required: ["translations"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_category_translations" } },
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("Failed to get translations from AI");
    }

    const { translations } = JSON.parse(toolCall.function.arguments);

    // Map original names to IDs
    const nameToId = new Map(needsTranslation.map((c) => [c.name, c.id]));

    let inserted = 0;
    for (const t of translations) {
      const categoryId = nameToId.get(t.original_name);
      if (!categoryId) continue;

      const { error } = await supabase
        .from("category_translations")
        .upsert(
          {
            category_id: categoryId,
            language_code: t.language_code,
            translated_name: t.translated_name,
            translated_description: t.translated_description || null,
          },
          { onConflict: "category_id,language_code" }
        );

      if (!error) inserted++;
    }

    console.log(`Translated ${inserted} category entries`);

    return new Response(
      JSON.stringify({ success: true, translated: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Category translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Translation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
