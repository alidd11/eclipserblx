import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendBotMessage } from "../_shared/discord-bot.ts";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Category ID → Discord channel ID mapping
const CATEGORY_CHANNEL_MAP: Record<string, string> = {
  // Bundle Deals
  "1f038600-9391-4dbd-8020-60caa96a5358": "1475326670347964517",
  // Vehicles (all vehicle sub-categories), Maps, Buildings
  "b86599a0-3349-49d2-89e8-4a6700df095d": "1475335169245184191", // Civilian Vehicles
  "90e1a457-8b47-4ae4-8508-e7a9ae965128": "1475335169245184191", // Fire Vehicles
  "e8f1980b-73fd-450e-adfd-18c410a7159a": "1475335169245184191", // Marked Police Vehicles
  "93d1b09e-531b-4442-b7d8-0c32a0eaa59e": "1475335169245184191", // Unmarked Police Vehicles
  "b0e4c031-7431-4057-be55-3d8a7c2e2143": "1475335169245184191", // Ambulance Vehicles
  "348942a6-210d-4f93-88a7-6d34256f3868": "1475335169245184191", // Military Vehicles
  "aea69afd-770e-4124-a4fd-195ac54c524c": "1475335169245184191", // Aircraft
  "6408b466-5ab9-46b5-a610-b3e68563e9cd": "1475331048177930343", // Maps
  "d469818e-ab54-43e1-8bb2-6dfd4a4eee83": "1475312997365973126", // Buildings
  // Scripts & Systems (Roblox Systems)
  "d9e7a997-d23e-418a-a11a-fe3e99977d34": "1475320443333509261",
  // Roblox UI
  "9bf04912-43f4-4b44-9cca-5709e7ab64b5": "1475320727505866753",
  // Bots (Discord Bots)
  "852838dc-adb6-4154-93fe-d1814fe46263": "1475316486594887751",
  // Roblox Bots
  "40c65de2-baab-4b9d-b695-f562dafff19b": "1475316541665972306",
  // Uniforms
  "1ce201f8-e223-480c-a945-89da58455858": "1475335646540337324",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders }
  const _unauth = requireServiceRole(req, corsHeaders);
  if (_unauth) return _unauth;
);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find active, approved products that:
    // 1. Have a category mapped to a feed channel
    // 2. Have at least one image
    // 3. Haven't been posted to the feed yet (feed_notified_at IS NULL)
    const categoryIds = Object.keys(CATEGORY_CHANNEL_MAP);

    const { data: products, error: fetchError } = await supabase
      .from("products")
      .select(`
        id, name, slug, product_number, price, images, description, category_id,
        stores ( name, slug ),
        categories ( name )
      `)
      .eq("is_active", true)
      .eq("moderation_status", "approved")
      .is("feed_notified_at", null)
      .in("category_id", categoryIds)
      .not("images", "is", null);

    if (fetchError) {
      console.error("[post-category-product-feed] Fetch error:", fetchError);
      throw fetchError;
    }

    // Filter products that actually have at least one image
    const eligibleProducts = (products || []).filter(
      (p: any) => Array.isArray(p.images) && p.images.length > 0
    );

    if (eligibleProducts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, posted: 0, message: "No new products to post" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[post-category-product-feed] Found ${eligibleProducts.length} products to post`);

    let posted = 0;

    for (const product of eligibleProducts) {
      const channelId = CATEGORY_CHANNEL_MAP[product.category_id!];
      if (!channelId) continue;

      const storeName = (product as any).stores?.name || "Unknown Store";
      const categoryName = (product as any).categories?.name || "Unknown";
      const productUrl = `https://eclipserblx.com/products/${product.product_number || encodeURIComponent(product.slug)}`;
      const images: string[] = product.images as string[];

      // Strip HTML from description
      let desc = product.description
        ? product.description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
        : null;
      if (desc && desc.length > 200) {
        desc = desc.substring(0, 197) + "...";
      }

      const embeds: any[] = [
        {
          title: product.name,
          description: desc || undefined,
          color: 0x5865f2,
          url: productUrl,
          fields: [
            { name: "🏪 Store", value: storeName, inline: true },
            { name: "💰 Price", value: `£${Number(product.price).toFixed(2)}`, inline: true },
            { name: "📁 Category", value: categoryName, inline: true },
          ],
        },
      ];

      // Attach up to 2 images as separate embeds (no url so they appear on separate lines)
      if (images[0]) {
        embeds.push({ color: 0x5865f2, image: { url: images[0] } });
      }
      if (images[1]) {
        embeds.push({ color: 0x5865f2, image: { url: images[1] } });
      }

      const result = await sendBotMessage(channelId, { embeds });

      if (result.success) {
        // Mark product as posted
        await supabase
          .from("products")
          .update({ feed_notified_at: new Date().toISOString() })
          .eq("id", product.id);

        posted++;
        console.log(`[post-category-product-feed] Posted ${product.name} to channel ${channelId}`);
      } else {
        console.error(`[post-category-product-feed] Failed to post ${product.name}:`, result.error);
      }

      // Small delay to avoid Discord rate limits
      await new Promise((r) => setTimeout(r, 1000));
    }

    return new Response(
      JSON.stringify({ success: true, posted, total: eligibleProducts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[post-category-product-feed] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
