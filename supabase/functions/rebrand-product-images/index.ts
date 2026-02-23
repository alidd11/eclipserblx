import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUANTIS_STORE_ID = "83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a";
const QUANTIS_WATERMARK_URL = "https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/store-branding/quantis-watermark.png";
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Cache the watermark image globally
let cachedWatermark: Uint8Array | null = null;

async function getWatermark(): Promise<Uint8Array> {
  if (cachedWatermark) return cachedWatermark;
  const response = await fetch(QUANTIS_WATERMARK_URL);
  if (!response.ok) throw new Error(`Failed to fetch watermark: ${response.status}`);
  cachedWatermark = new Uint8Array(await response.arrayBuffer());
  return cachedWatermark;
}

// Convert image bytes to base64 data URL
function toBase64DataUrl(bytes: Uint8Array, mimeType: string): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

// Use Gemini AI to remove Eclipse watermark from an image
async function removeWatermarkWithAI(imageUrl: string, apiKey: string): Promise<Uint8Array | null> {
  console.log("Sending image to AI for watermark removal...");
  
  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "I own this product image and am rebranding my business from 'Eclipse' to 'Quantis'. Please edit this image I created to replace my old branding. Remove the semi-transparent text overlay that reads 'Eclipse' and 'Selling You An Experience' by inpainting those areas to match the surrounding image content. Also remove any semi-transparent circular logo mark. The helicopter, background, and all other elements must remain identical. Output the cleaned image only.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`AI gateway error: ${response.status} - ${errorText}`);
    return null;
  }

  const data = await response.json();
  const imageResult = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  
  if (!imageResult) {
    console.error("No image returned from AI:", JSON.stringify(data).substring(0, 500));
    return null;
  }

  // Parse base64 data URL
  const base64Match = imageResult.match(/^data:image\/\w+;base64,(.+)$/);
  if (!base64Match) {
    console.error("Invalid base64 image format");
    return null;
  }

  const binaryStr = atob(base64Match[1]);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  
  console.log(`AI returned image: ${bytes.length} bytes`);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { product_id, dry_run, skip_ai, image_index } = await req.json();

    // Fetch products to process
    let query = supabase
      .from("products")
      .select("id, name, images")
      .eq("store_id", QUANTIS_STORE_ID)
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
      const totalImages = products.reduce((sum, p) => {
        const imgs = (p.images || []).filter((u: string) => !/\.(mp4|webm|gif)$/i.test(u));
        return sum + imgs.length;
      }, 0);
      return new Response(
        JSON.stringify({
          message: `Would process ${products.length} products with ${totalImages} processable images`,
          products: products.map(p => ({
            id: p.id,
            name: p.name,
            imageCount: p.images?.length || 0,
            processable: (p.images || []).filter((u: string) => !/\.(mp4|webm|gif)$/i.test(u)).length,
          }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!product_id) {
      return new Response(
        JSON.stringify({
          message: "Please provide a product_id. Use dry_run:true to list all products.",
          products: products.map(p => ({ id: p.id, name: p.name, imageCount: p.images?.length || 0 }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const product = products[0];
    const images: string[] = product.images || [];
    const results: Array<{ index: number; original: string; new_url: string | null; status: string }> = [];

    // Load watermark
    console.log("Loading Quantis watermark...");
    const watermarkBytes = await getWatermark();
    const watermarkImage = await Image.decode(watermarkBytes);
    console.log(`Watermark loaded: ${watermarkImage.width}x${watermarkImage.height}`);

    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i];

      // Optionally process only a specific image index
      if (image_index !== undefined && image_index !== null && i !== image_index) {
        results.push({ index: i, original: imageUrl, new_url: imageUrl, status: "skipped (not selected)" });
        continue;
      }

      // Skip videos and GIFs
      if (/\.(mp4|webm|gif)$/i.test(imageUrl)) {
        results.push({ index: i, original: imageUrl, new_url: imageUrl, status: "skipped (video/gif)" });
        continue;
      }

      try {
        console.log(`Processing image ${i}: ${imageUrl}`);

        let cleanedBytes: Uint8Array;

        if (skip_ai) {
          // Just fetch the original and overlay watermark (no AI removal)
          const imgResponse = await fetch(imageUrl);
          if (!imgResponse.ok) {
            results.push({ index: i, original: imageUrl, new_url: null, status: `fetch error: ${imgResponse.status}` });
            continue;
          }
          cleanedBytes = new Uint8Array(await imgResponse.arrayBuffer());
        } else {
          // Step 1: Use AI to remove Eclipse watermark
          const aiResult = await removeWatermarkWithAI(imageUrl, lovableApiKey);
          if (!aiResult) {
            results.push({ index: i, original: imageUrl, new_url: null, status: "AI watermark removal failed" });
            continue;
          }
          cleanedBytes = aiResult;
        }

        // Step 2: Decode the cleaned image
        const cleanedImage = await Image.decode(cleanedBytes);
        console.log(`Cleaned image: ${cleanedImage.width}x${cleanedImage.height}`);

        // Step 3: Overlay Quantis watermark
        // Scale watermark to ~15% of image width (small, bottom-right)
        const targetWidth = Math.round(cleanedImage.width * 0.15);
        const scale = targetWidth / watermarkImage.width;
        const targetHeight = Math.round(watermarkImage.height * scale);

        const scaledWatermark = watermarkImage.clone().resize(targetWidth, targetHeight);

        // Position watermark at bottom-right with padding
        const padding = Math.round(cleanedImage.width * 0.03);
        const x = cleanedImage.width - targetWidth - padding;
        const y = cleanedImage.height - targetHeight - padding;

        cleanedImage.composite(scaledWatermark, x, y);

        // Step 4: Encode and upload
        const outputBytes = await cleanedImage.encode();

        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const ext = imageUrl.match(/\.(jpe?g|png|webp)/i)?.[1] || "png";
        const newPath = `quantis-rebranded/${timestamp}-${randomSuffix}.png`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(newPath, outputBytes, {
            contentType: "image/png",
            upsert: false,
          });

        if (uploadError) {
          results.push({ index: i, original: imageUrl, new_url: null, status: `upload error: ${uploadError.message}` });
          continue;
        }

        const { data: publicUrl } = supabase.storage
          .from("product-images")
          .getPublicUrl(newPath);

        results.push({ index: i, original: imageUrl, new_url: publicUrl.publicUrl, status: "success" });
        console.log(`Done: ${publicUrl.publicUrl}`);
      } catch (imgErr) {
        console.error(`Image error:`, imgErr);
        results.push({ index: i, original: imageUrl, new_url: null, status: `error: ${String(imgErr)}` });
      }
    }

    // Update product images in database
    const newImages = images.map((orig, i) => {
      const result = results.find(r => r.index === i);
      return result?.new_url || orig;
    });

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
