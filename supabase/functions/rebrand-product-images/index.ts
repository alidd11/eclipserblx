import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

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

    // Fetch the overlay image once
    console.log("Fetching overlay image...");
    const overlayResponse = await fetch(OVERLAY_URL);
    if (!overlayResponse.ok) {
      throw new Error(`Failed to fetch overlay: ${overlayResponse.status}`);
    }
    const overlayBytes = new Uint8Array(await overlayResponse.arrayBuffer());
    const overlayImage = await Image.decode(overlayBytes);
    console.log(`Overlay loaded: ${overlayImage.width}x${overlayImage.height}`);

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

        // Scale the overlay to ~20% of the base image width
        const targetWidth = Math.round(baseImage.width * 0.20);
        const scaleFactor = targetWidth / overlayImage.width;
        const targetHeight = Math.round(overlayImage.height * scaleFactor);
        const scaledOverlay = overlayImage.clone().resize(targetWidth, targetHeight);

        // Position in bottom-right with padding
        const padding = Math.round(baseImage.width * 0.03);
        const x = baseImage.width - targetWidth - padding;
        const y = baseImage.height - targetHeight - padding;

        // Composite the overlay onto the base image at full opacity
        baseImage.composite(scaledOverlay, x, y);

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
