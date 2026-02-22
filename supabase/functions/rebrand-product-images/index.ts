import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image, TextLayout } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUANTIS_STORE_ID = "83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a";

// Google Fonts CDN for a clean sans-serif font (Inter Bold)
const FONT_URL = "https://unpkg.com/inter-font@3.19.0/ttf/Inter-Bold.ttf";

// Cache the font globally
let cachedFont: Uint8Array | null = null;

async function getFont(): Promise<Uint8Array> {
  if (cachedFont) return cachedFont;
  const response = await fetch(FONT_URL);
  if (!response.ok) throw new Error(`Failed to fetch font: ${response.status}`);
  cachedFont = new Uint8Array(await response.arrayBuffer());
  return cachedFont;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    // Load font
    console.log("Loading font...");
    const font = await getFont();
    console.log(`Font loaded: ${font.length} bytes`);

    for (const imageUrl of images) {
      // Skip videos and GIFs
      if (/\.(mp4|webm|gif)$/i.test(imageUrl)) {
        results.push({ original: imageUrl, new_url: imageUrl, error: "Skipped (video/gif)" });
        continue;
      }

      try {
        // Fetch the product image
        console.log(`Processing: ${imageUrl}`);
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) {
          results.push({ original: imageUrl, new_url: null, error: `Fetch error: ${imgResponse.status}` });
          continue;
        }
        const imgBytes = new Uint8Array(await imgResponse.arrayBuffer());
        const baseImage = await Image.decode(imgBytes);
        console.log(`Base image: ${baseImage.width}x${baseImage.height}`);

        // Calculate font size relative to image (about 5% of image width)
        const fontSize = Math.max(24, Math.round(baseImage.width * 0.05));

        // Render "Quantis" text in white
        const textImage = Image.renderText(
          font,
          fontSize,
          "Quantis",
          0xFFFFFFFF, // White, full opacity
          new TextLayout({ maxWidth: baseImage.width })
        );

        // Also render a shadow version for contrast
        const shadowImage = Image.renderText(
          font,
          fontSize,
          "Quantis",
          0x00000088, // Black, ~53% opacity for shadow
          new TextLayout({ maxWidth: baseImage.width })
        );

        // Position in bottom-right with padding
        const padding = Math.round(baseImage.width * 0.03);
        const x = baseImage.width - textImage.width - padding;
        const y = baseImage.height - textImage.height - padding;

        // Composite shadow first (offset by 2px), then white text on top
        baseImage.composite(shadowImage, x + 2, y + 2);
        baseImage.composite(textImage, x, y);

        // Encode as PNG
        const outputBytes = await baseImage.encode();

        // Upload to storage
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const newPath = `quantis-rebranded/${timestamp}-${randomSuffix}.png`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(newPath, outputBytes, {
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
        console.log(`Done: ${publicUrl.publicUrl}`);
      } catch (imgErr) {
        console.error(`Image error:`, imgErr);
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
