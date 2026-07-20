import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const QUANTIS_WATERMARK_URL =
  "https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/store-branding/quantis-watermark.png";

let cachedWatermark: Uint8Array | null = null;

async function getWatermark(): Promise<Uint8Array> {
  if (cachedWatermark) return cachedWatermark;
  const res = await fetch(QUANTIS_WATERMARK_URL);
  if (!res.ok) throw new Error(`Failed to fetch watermark: ${res.status}`);
  cachedWatermark = new Uint8Array(await res.arrayBuffer());
  return cachedWatermark;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const _unauth = requireServiceRole(req, corsHeaders);
  if (_unauth) return _unauth;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { image_url, storage_path } = await req.json();

    if (!image_url || !storage_path) {
      return new Response(
        JSON.stringify({ error: "image_url and storage_path are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip videos/gifs
    if (/\.(mp4|webm|gif)$/i.test(image_url)) {
      return new Response(
        JSON.stringify({ success: true, url: image_url, skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the uploaded image
    const imgRes = await fetch(image_url);
    if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`);
    const imgBytes = new Uint8Array(await imgRes.arrayBuffer());

    // Decode image
    const img = await Image.decode(imgBytes);

    // Load and scale watermark to 40% of image width
    const wmBytes = await getWatermark();
    const wm = await Image.decode(wmBytes);
    
    // Auto-trim transparent padding from watermark
    // Find the actual content bounds by scanning rows from bottom
    let bottomContent = wm.height - 1;
    for (let row = wm.height - 1; row >= 0; row--) {
      let hasContent = false;
      for (let col = 0; col < wm.width; col++) {
        const pixel = wm.getPixelAt(col + 1, row + 1); // 1-indexed
        const alpha = (pixel >> 0) & 0xFF; // Alpha is lowest byte in imagescript
        if (alpha > 10) { hasContent = true; break; }
      }
      if (hasContent) { bottomContent = row; break; }
    }
    
    // Crop off bottom transparent padding
    const cropHeight = bottomContent + 1;
    const croppedWm = wm.clone().crop(0, 0, wm.width, cropHeight);
    
    const targetW = Math.round(img.width * 0.45);
    const scale = targetW / croppedWm.width;
    const targetH = Math.round(croppedWm.height * scale);
    const scaledWm = croppedWm.resize(targetW, targetH);

    // Position bottom-right, flush with edges
    const padX = Math.round(img.width * 0.02);
    const padY = 20; // A bit more gap from bottom
    const x = img.width - targetW - padX;
    const y = img.height - targetH - padY;
    img.composite(scaledWm, x, y);

    // Encode and overwrite the original file in storage
    const outputBytes = await img.encode();

    // Delete the original then re-upload (upsert)
    await supabase.storage.from("product-images").remove([storage_path]);

    const { error: uploadErr } = await supabase.storage
      .from("product-images")
      .upload(storage_path, outputBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabase.storage
      .from("product-images")
      .getPublicUrl(storage_path);

    return new Response(
      JSON.stringify({ success: true, url: publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Watermark error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
