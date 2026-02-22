import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUANTIS_STORE_ID = "83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a";
const OVERLAY_URL = "https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/store-branding/quantis-overlay.png";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { product_id, dry_run } = await req.json();

    // Fetch products to process
    let query = supabase
      .from("products")
      .select("id, name, images")
      .eq("store_id", QUANTIS_STORE_ID)
      .eq("is_active", true)
      .not("images", "is", null);

    if (product_id) {
      query = query.eq("id", product_id);
    }

    const { data: products, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;
    if (!products?.length) {
      return new Response(
        JSON.stringify({ message: "No products found to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (dry_run) {
      const totalImages = products.reduce((sum, p) => sum + (p.images?.length || 0), 0);
      return new Response(
        JSON.stringify({
          message: `Would process ${products.length} products with ${totalImages} images`,
          products: products.map(p => ({ id: p.id, name: p.name, imageCount: p.images?.length || 0 }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process one product at a time (pass product_id for individual processing)
    if (!product_id) {
      return new Response(
        JSON.stringify({
          message: "Please provide a product_id to process. Use dry_run:true to see all products.",
          products: products.map(p => ({ id: p.id, name: p.name, imageCount: p.images?.length || 0 }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const product = products[0];
    const images = product.images || [];
    const results: Array<{ original: string; new_url: string | null; error?: string }> = [];

    for (const imageUrl of images) {
      // Skip videos and GIFs
      if (/\.(mp4|webm|gif)$/i.test(imageUrl)) {
        results.push({ original: imageUrl, new_url: imageUrl, error: "Skipped (video/gif)" });
        continue;
      }

      try {
        // Call AI to remove old Eclipse watermark and add Quantis overlay
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "I am the owner of this product and store. I am rebranding my store from 'Eclipse' to 'Quantis'. Please edit this product image by: 1) Removing the old 'Eclipse' store branding text/logo that I previously added. 2) Adding my new Quantis logo (provided as the second image) to the bottom-right corner at full 100% opacity with no transparency. This is my own content and branding. Return the edited image."
                  },
                  {
                    type: "image_url",
                    image_url: { url: imageUrl }
                  },
                  {
                    type: "image_url",
                    image_url: { url: OVERLAY_URL }
                  }
                ]
              }
            ],
            modalities: ["image", "text"]
          })
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error("AI error response:", errText.slice(0, 500));
          results.push({ original: imageUrl, new_url: null, error: `AI error: ${aiResponse.status} - ${errText.slice(0, 200)}` });
          continue;
        }

        const aiData = await aiResponse.json();
        console.log("AI response keys:", JSON.stringify(Object.keys(aiData)));
        console.log("AI choices:", JSON.stringify(aiData.choices?.map((c: any) => ({
          hasImages: !!c.message?.images?.length,
          contentPreview: c.message?.content?.slice(0, 200),
          imageCount: c.message?.images?.length || 0,
        }))));
        const generatedImage = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!generatedImage) {
          results.push({ original: imageUrl, new_url: null, error: "AI did not return an image" });
          continue;
        }

        // Convert base64 to bytes - clean the string thoroughly first
        let base64Data = generatedImage.trim();
        // Remove data URI prefix if present
        if (base64Data.includes(",") && base64Data.startsWith("data:")) {
          base64Data = base64Data.split(",")[1];
        }
        // Remove any whitespace/newlines that could corrupt the decode
        base64Data = base64Data.replace(/\s/g, "");
        const imageBytes = decodeBase64(base64Data);

        // Upload to storage with new filename - always use PNG since AI returns PNG
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const newPath = `quantis-rebranded/${timestamp}-${randomSuffix}.png`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(newPath, imageBytes, {
            contentType: "image/png",
            upsert: false,
          });

        if (uploadError) {
          results.push({ original: imageUrl, new_url: null, error: `Upload error: ${uploadError.message}` });
          continue;
        }

        const { data: publicUrl } = supabase.storage
          .from("product-images")
          .getPublicUrl(newPath);

        results.push({ original: imageUrl, new_url: publicUrl.publicUrl });
      } catch (imgErr) {
        results.push({ original: imageUrl, new_url: null, error: String(imgErr) });
      }
    }

    // Update product images in database
    const newImages = results.map(r => r.new_url || r.original);
    const { error: updateError } = await supabase
      .from("products")
      .update({ images: newImages })
      .eq("id", product.id);

    return new Response(
      JSON.stringify({
        success: true,
        product_id: product.id,
        product_name: product.name,
        results,
        update_error: updateError?.message || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
