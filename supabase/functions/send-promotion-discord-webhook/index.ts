import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 import { sendBotMessage, buildSettingsMap } from "../_shared/discord-bot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PromotionRequest {
  type: 'discount_code' | 'special_offer';
  discount_id?: string;
  offer_id?: string;
  // For manual sending with custom data
  custom?: {
    title: string;
    description: string;
    code?: string;
    discount_value?: string;
    expires_at?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch promotions channel ID and webhook URL from settings
    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["promotions_discord_channel_id", "promotions_discord_webhook_url", "discord_webhook_url", "promotions_discord_role_id"])
      .order("key");

    const settingsMap = buildSettingsMap(settings);

    // Check for channel ID first, then webhook URLs
    const channelId = settingsMap["promotions_discord_channel_id"];
    const webhookUrl = settingsMap["promotions_discord_webhook_url"] || settingsMap["discord_webhook_url"];
    const roleId = settingsMap["promotions_discord_role_id"];
    
    if (!channelId && !webhookUrl) {
      console.error("Discord channel ID or webhook URL not configured");
      return new Response(
        JSON.stringify({ error: "Discord not configured. Please set promotions_discord_channel_id or webhook URL in settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: PromotionRequest = await req.json();
    // Use configured role ID or fallback to hardcoded one
    const ROLE_PING = roleId ? `<@&${roleId}>` : "<@&1465322212319039639>";

    let embed: Record<string, unknown>;
    
    // Eclipse branding banner - always included at the bottom of announcements
    const brandingBannerUrl = "https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/store-branding/eclipse-discord-banner.png";

    if (body.custom) {
      // Custom promotion data provided
      const { title, description, code, discount_value, expires_at } = body.custom;
      
      embed = {
        title: `🎉 ${title}`,
        description: description,
        color: 0xFF6B6B, // Red/coral for promotions
        fields: [] as Array<{ name: string; value: string; inline: boolean }>,
        image: { url: brandingBannerUrl },
        footer: {
          text: "Eclipse Marketplace • Limited Time Offer",
        },
        timestamp: new Date().toISOString(),
      };

      if (code) {
        (embed.fields as Array<{ name: string; value: string; inline: boolean }>).push({
          name: "🏷️ Code",
          value: `\`${code}\``,
          inline: true,
        });
      }

      if (discount_value) {
        (embed.fields as Array<{ name: string; value: string; inline: boolean }>).push({
          name: "💰 Discount",
          value: discount_value,
          inline: true,
        });
      }

      if (expires_at) {
        const expiryDate = new Date(expires_at);
        (embed.fields as Array<{ name: string; value: string; inline: boolean }>).push({
          name: "⏰ Expires",
          value: `<t:${Math.floor(expiryDate.getTime() / 1000)}:R>`,
          inline: true,
        });
      }

      (embed.fields as Array<{ name: string; value: string; inline: boolean }>).push({
        name: "🛒 Shop Now",
        value: "[**Browse Products →**](https://eclipserblx.com/products)",
        inline: false,
      });

    } else if (body.type === 'discount_code' && body.discount_id) {
      // Fetch discount code from database
      const { data: discount, error } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("id", body.discount_id)
        .maybeSingle();

      if (error || !discount) {
        return new Response(
          JSON.stringify({ error: "Discount code not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const discountDisplay = discount.discount_type === 'percentage' 
        ? `${discount.discount_value}% OFF` 
        : `£${discount.discount_value.toFixed(2)} OFF`;

      embed = {
        title: "🏷️ New Discount Code Available!",
        description: `Use code **\`${discount.code}\`** to save on your next purchase!\n\n━━━━━━━━━━━━━━━━━━━━━━`,
        color: 0x00D26A, // Green for discounts
        fields: [
          {
            name: "💰 Discount",
            value: discountDisplay,
            inline: true,
          },
          {
            name: "📊 Usage",
            value: discount.max_uses ? `${discount.current_uses || 0}/${discount.max_uses} uses` : "Unlimited",
            inline: true,
          },
        ] as Array<{ name: string; value: string; inline: boolean }>,
        image: { url: brandingBannerUrl },
        footer: {
          text: "Eclipse Marketplace • Discount Code",
        },
        timestamp: new Date().toISOString(),
      };

      if (discount.expires_at) {
        const expiryDate = new Date(discount.expires_at);
        (embed.fields as Array<{ name: string; value: string; inline: boolean }>).push({
          name: "⏰ Expires",
          value: `<t:${Math.floor(expiryDate.getTime() / 1000)}:F>`,
          inline: true,
        });
      }

      if (discount.min_order_amount) {
        (embed.fields as Array<{ name: string; value: string; inline: boolean }>).push({
          name: "📦 Minimum Order",
          value: `£${discount.min_order_amount.toFixed(2)}`,
          inline: true,
        });
      }

      (embed.fields as Array<{ name: string; value: string; inline: boolean }>).push({
        name: "\u200B",
        value: "[**🛒 Shop Now →**](https://eclipserblx.com/products)",
        inline: false,
      });

    } else if (body.type === 'special_offer' && body.offer_id) {
      // Fetch special offer from database
      const { data: offer, error } = await supabase
        .from("special_offers")
        .select("*")
        .eq("id", body.offer_id)
        .maybeSingle();

      if (error || !offer) {
        return new Response(
          JSON.stringify({ error: "Special offer not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      embed = {
        title: `🎁 ${offer.name || 'Special Offer'}`,
        description: offer.description || "Don't miss out on this exclusive offer!",
        color: 0xFFD700, // Gold for special offers
        fields: [] as Array<{ name: string; value: string; inline: boolean }>,
        image: { url: brandingBannerUrl },
        footer: {
          text: "Eclipse Marketplace • Special Offer",
        },
        timestamp: new Date().toISOString(),
      };

      if (offer.reward_type && offer.reward_value) {
        let rewardText = '';
        if (offer.reward_type === 'eclipse_plus_days') {
          rewardText = `${offer.reward_value} days of Eclipse+ free!`;
        } else if (offer.reward_type === 'discount') {
          rewardText = `${offer.reward_value}% discount`;
        } else {
          rewardText = `${offer.reward_value} ${offer.reward_type}`;
        }
        (embed.fields as Array<{ name: string; value: string; inline: boolean }>).push({
          name: "🎁 Reward",
          value: rewardText,
          inline: true,
        });
      }

      if (offer.ends_at) {
        const endDate = new Date(offer.ends_at);
        (embed.fields as Array<{ name: string; value: string; inline: boolean }>).push({
          name: "⏰ Ends",
          value: `<t:${Math.floor(endDate.getTime() / 1000)}:R>`,
          inline: true,
        });
      }

      (embed.fields as Array<{ name: string; value: string; inline: boolean }>).push({
        name: "\u200B",
        value: "[**🚀 Claim Now →**](https://eclipserblx.com)",
        inline: false,
      });

    } else {
      return new Response(
        JSON.stringify({ error: "Invalid request. Provide type with id or custom data." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending promotion webhook to Discord...");

    // Use bot API if channel ID is configured, otherwise fall back to webhook
    if (channelId) {
      const effectiveRoleId = roleId || "1465322212319039639";
      const result = await sendBotMessage(channelId, {
        content: ROLE_PING,
        embeds: [embed],
        allowed_mentions: { roles: [effectiveRoleId] },
      });

      if (!result.success) {
        return new Response(
          JSON.stringify({ error: "Failed to send Discord message", details: result.error }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Promotion sent successfully via bot", { messageId: result.messageId });
    } else {
      // Legacy webhook method
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: ROLE_PING,
          embeds: [embed],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Discord webhook error:", errorText);
        return new Response(
          JSON.stringify({ error: "Failed to send Discord message", details: errorText }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Promotion webhook sent successfully");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Promotion announcement sent to Discord" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending promotion webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
