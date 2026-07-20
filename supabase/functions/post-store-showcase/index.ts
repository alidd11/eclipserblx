import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FORUM_CHANNEL_ID = "1475346195340595222";
const DISCORD_API_BASE = "https://discord.com/api/v10";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const _unauth = requireServiceRole(req, corsHeaders);
  if (_unauth) return _unauth;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!botToken) {
      throw new Error("DISCORD_CUSTOMER_BOT_TOKEN not configured");
    }

    // Find verified stores that haven't been showcased yet
    const { data: stores, error: fetchError } = await supabase
      .from("stores")
      .select(`
        id, name, slug, description, logo_url, banner_url, 
        average_rating, total_sales, product_count, follower_count,
        discord_url, website_url, twitter_url, youtube_url, tiktok_url, roblox_url
      `)
      .eq("is_verified", true)
      .eq("is_active", true)
      .is("discord_showcase_thread_id", null)
      .is("deleted_at", null);

    if (fetchError) {
      console.error("[post-store-showcase] Fetch error:", fetchError);
      throw fetchError;
    }

    if (!stores || stores.length === 0) {
      return new Response(
        JSON.stringify({ success: true, posted: 0, message: "No new stores to showcase" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[post-store-showcase] Found ${stores.length} stores to showcase`);

    let posted = 0;

    for (const store of stores) {
      // Fetch products with images first, then others
      const { data: productsWithImages } = await supabase
        .from("products")
        .select("id, name, slug, product_number, price, images")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .eq("moderation_status", "approved")
        .not("images", "eq", "[]")
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: productsAll } = await supabase
        .from("products")
        .select("id, name, slug, product_number, price, images")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false })
        .limit(5);

      // Merge: prioritize products with images, fill remaining from all
      const seenIds = new Set<string>();
      const products: any[] = [];
      for (const p of [...(productsWithImages || []), ...(productsAll || [])]) {
        if (!seenIds.has(p.id) && products.length < 5) {
          seenIds.add(p.id);
          products.push(p);
        }
      }

      const storeUrl = `https://eclipserblx.com/store/${encodeURIComponent(store.slug)}`;
      
      // Build store description
      let desc = store.description
        ? store.description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
        : "No description provided.";
      if (desc.length > 300) {
        desc = desc.substring(0, 297) + "...";
      }

      // Build rating display
      const rating = store.average_rating
        ? `${"⭐".repeat(Math.round(store.average_rating))} ${Number(store.average_rating).toFixed(1)}/5`
        : "No ratings yet";

      // Build links section
      const links: string[] = [`🌐 [Visit Store](${storeUrl})`];
      if (store.discord_url) links.push(`💬 [Discord](${store.discord_url})`);
      if (store.website_url) links.push(`🔗 [Website](${store.website_url})`);
      if (store.roblox_url) links.push(`🎮 [Roblox](${store.roblox_url})`);
      if (store.twitter_url) links.push(`🐦 [Twitter](${store.twitter_url})`);
      if (store.youtube_url) links.push(`📺 [YouTube](${store.youtube_url})`);
      if (store.tiktok_url) links.push(`🎵 [TikTok](${store.tiktok_url})`);

      // Build product list
      let productList = "";
      if (products && products.length > 0) {
        productList = products
          .map((p: any) => {
            const productUrl = `https://eclipserblx.com/products/${p.product_number || encodeURIComponent(p.slug)}`;
            return `• [${p.name}](${productUrl}) — £${Number(p.price).toFixed(2)}`;
          })
          .join("\n");
      }

      // Build the main embed
      const embeds: any[] = [
        {
          title: `🏪 ${store.name}`,
          description: desc,
          color: 0x5865f2,
          url: storeUrl,
          fields: [
            { name: "⭐ Rating", value: rating, inline: true },
            { name: "📦 Products", value: `${store.product_count || 0}`, inline: true },
            { name: "👥 Followers", value: `${store.follower_count || 0}`, inline: true },
            { name: "🔗 Links", value: links.join(" • "), inline: false },
          ],
        },
      ];

      // Add products field if available
      if (productList) {
        embeds[0].fields.push({
          name: "🛍️ Featured Products",
          value: productList,
          inline: false,
        });
      }

      // Add store logo as thumbnail on main embed
      if (store.logo_url) {
        embeds[0].thumbnail = { url: store.logo_url };
      }

      // Add product images as separate image embeds (Discord max 10 embeds per message)
      const maxImageEmbeds = Math.min(9, 10 - embeds.length - (store.banner_url ? 1 : 0));
      let addedImages = 0;
      if (products && products.length > 0) {
        for (let i = 0; i < products.length && addedImages < maxImageEmbeds; i++) {
          const p = products[i] as any;
          if (Array.isArray(p.images) && p.images.length > 0) {
            embeds.push({
              color: 0x5865f2,
              image: { url: p.images[0] },
            });
            addedImages++;
          }
        }
      }

      // Add banner as final image embed
      if (store.banner_url) {
        embeds.push({ color: 0x5865f2, image: { url: store.banner_url } });
      }

      // Create forum thread (post) via Discord API
      const threadResponse = await fetch(
        `${DISCORD_API_BASE}/channels/${FORUM_CHANNEL_ID}/threads`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: store.name.substring(0, 100),
            message: { embeds },
            auto_archive_duration: 10080, // 7 days
          }),
        }
      );

      if (threadResponse.ok) {
        const threadData = await threadResponse.json();
        const threadId = threadData.id;

        // Save the thread ID to prevent re-posting
        await supabase
          .from("stores")
          .update({ discord_showcase_thread_id: threadId })
          .eq("id", store.id);

        posted++;
        console.log(`[post-store-showcase] Posted ${store.name} as forum thread ${threadId}`);
      } else {
        const errorText = await threadResponse.text();
        console.error(`[post-store-showcase] Failed to post ${store.name}:`, threadResponse.status, errorText);
      }

      // Rate limit delay
      await new Promise((r) => setTimeout(r, 1500));
    }

    return new Response(
      JSON.stringify({ success: true, posted, total: stores.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[post-store-showcase] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
