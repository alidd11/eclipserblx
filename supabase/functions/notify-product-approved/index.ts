import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";
import { sendBotMessage, buildSettingsMap } from "../_shared/discord-bot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOG = (s: string, d?: unknown) =>
  console.log(`[notify-product-approved] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept service-role calls (from DB trigger or admin)
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (token !== serviceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { productId } = await req.json();
    if (!productId) {
      return new Response(JSON.stringify({ error: "productId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceKey
    );

    // Fetch product with store info
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select(
        "id, name, slug, product_number, price, images, description, early_access_hours, store_id, stores!inner(id, name, slug, logo_url, discord_guild_id)"
      )
      .eq("id", productId)
      .single();

    if (prodErr || !product) {
      LOG("Product not found", { productId, error: prodErr?.message });
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const store = (product as any).stores;
    const productLink = `https://eclipserblx.com/products/${product.product_number || encodeURIComponent(product.slug)}`;
    const images = (product.images as string[]) || [];
    const isEarlyAccess = (product.early_access_hours || 0) > 0;

    let description = product.description
      ? product.description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
      : null;
    if (description && description.length > 200) {
      description = description.substring(0, 197) + "...";
    }

    const color = isEarlyAccess ? 0x8b5cf6 : 0x00ced1;
    const results: string[] = [];

    // Build the embed
    const buildEmbeds = (earlyAccess: boolean) => {
      const embeds: any[] = [
        {
          title: earlyAccess
            ? "\uD83D\uDC51 Early Access Drop!"
            : "\uD83C\uDF89 New Product Drop!",
          description: earlyAccess
            ? `**${product.name}**\n\n*Members get early access!*${description ? `\n\n${description}` : ""}`
            : `**${product.name}**${description ? `\n\n${description}` : ""}`,
          color: earlyAccess ? 0x8b5cf6 : 0x00ced1,
          fields: [
            { name: "\uD83C\uDFEA Store", value: store.name, inline: true },
            {
              name: "\uD83D\uDCB0 Price",
              value: `\u00A3${Number(product.price).toFixed(2)}`,
              inline: true,
            },
            ...(earlyAccess
              ? [
                  {
                    name: "\u23F0 Early Access",
                    value: `${product.early_access_hours}h`,
                    inline: true,
                  },
                ]
              : []),
            {
              name: "\uD83D\uDD17 Link",
              value: `[View Product](${productLink})`,
              inline: false,
            },
          ],
          thumbnail: store.logo_url ? { url: store.logo_url } : undefined,
        },
      ];

      // Add product images
      if (images[0]) {
        embeds.push({
          color: embeds[0].color,
          image: { url: images[0] },
          ...(images.length === 1
            ? {
                footer: {
                  text: earlyAccess
                    ? "Eclipse Marketplace \u2022 Early Access"
                    : "Eclipse Marketplace \u2022 Product Drop",
                },
                timestamp: new Date().toISOString(),
              }
            : {}),
        });
      }
      if (images[1]) {
        embeds.push({
          color: embeds[0].color,
          image: { url: images[1] },
          footer: {
            text: earlyAccess
              ? "Eclipse Marketplace \u2022 Early Access"
              : "Eclipse Marketplace \u2022 Product Drop",
          },
          timestamp: new Date().toISOString(),
        });
      }

      return embeds;
    };

    // 1. Post to main Eclipse server channels (from global settings)
    const { data: globalSettings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", [
        "product_drops_discord_channel_id",
        "product_drops_discord_role_id",
        "early_product_drops_discord_channel_id",
        "early_product_drops_discord_role_id",
      ]);

    const settingsMap = buildSettingsMap(globalSettings);

    // Post to main product drops channel
    const mainChannelId = settingsMap["product_drops_discord_channel_id"];
    const mainRoleId = settingsMap["product_drops_discord_role_id"];
    if (mainChannelId) {
      const embeds = buildEmbeds(false);
      const res = await sendBotMessage(mainChannelId, {
        content: mainRoleId ? `<@&${mainRoleId}>` : undefined,
        embeds,
        allowed_mentions: mainRoleId ? { roles: [mainRoleId] } : undefined,
      });
      results.push(`main:${res.success ? "ok" : "fail"}`);
      LOG("Main channel", { channelId: mainChannelId, success: res.success });
    }

    // Post to early access channel if applicable
    if (isEarlyAccess) {
      const earlyChannelId =
        settingsMap["early_product_drops_discord_channel_id"];
      const earlyRoleId =
        settingsMap["early_product_drops_discord_role_id"];
      if (earlyChannelId) {
        const embeds = buildEmbeds(true);
        const res = await sendBotMessage(earlyChannelId, {
          content: earlyRoleId ? `<@&${earlyRoleId}>` : undefined,
          embeds,
          allowed_mentions: earlyRoleId
            ? { roles: [earlyRoleId] }
            : undefined,
        });
        results.push(`early:${res.success ? "ok" : "fail"}`);
        LOG("Early access channel", {
          channelId: earlyChannelId,
          success: res.success,
        });
      }
    }

    // 2. Post to seller's Discord server (if they have a product feed channel configured)
    if (store.discord_guild_id) {
      const { data: creds } = await supabase
        .from("store_credentials")
        .select("product_feed_channel_id, product_drops_role_id")
        .eq("store_id", store.id)
        .maybeSingle();

      if (creds?.product_feed_channel_id) {
        const embeds = buildEmbeds(false);
        const res = await sendBotMessage(creds.product_feed_channel_id, {
          content: creds.product_drops_role_id
            ? `<@&${creds.product_drops_role_id}>`
            : undefined,
          embeds,
          allowed_mentions: creds.product_drops_role_id
            ? { roles: [creds.product_drops_role_id] }
            : undefined,
        });
        results.push(`seller:${res.success ? "ok" : "fail"}`);
        LOG("Seller channel", {
          storeId: store.id,
          channelId: creds.product_feed_channel_id,
          success: res.success,
        });
      }
    }

    LOG("Complete", { productId, results });

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    LOG("ERROR", {
      message: err instanceof Error ? err.message : String(err),
    });
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
