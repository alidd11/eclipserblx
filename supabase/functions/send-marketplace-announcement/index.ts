import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 import { sendBotMessage, buildSettingsMap } from "../_shared/discord-bot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch Marketplace channel ID and webhook URL from settings
    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["marketplace_discord_channel_id", "marketplace_discord_webhook_url"])
      .order("key");

    const settingsMap = buildSettingsMap(settings);

    const channelId = settingsMap["marketplace_discord_channel_id"];
    const webhookUrl = settingsMap["marketplace_discord_webhook_url"];
    
    if (!channelId && !webhookUrl) {
      console.error("Marketplace Discord channel ID or webhook URL not configured in settings");
      return new Response(
        JSON.stringify({ error: "Marketplace Discord not configured. Please set channel ID or webhook URL in Admin → Discord Settings → Marketplace tab." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending Marketplace announcement...");
    
    const storagePublicBase = `${supabaseUrl}/storage/v1/object/public`;
    const brandingBannerUrl = `${storagePublicBase}/store-branding/eclipse-discord-banner.png`;

    const embed = {
      title: "🏪 Eclipse Marketplace",
      description: "Discover amazing products from talented creators in our community marketplace. Buy, sell, and connect with fellow Roblox developers!\n\n━━━━━━━━━━━━━━━━━━━━━━",
      color: 0x9b59b6,
      fields: [
        {
          name: "🛍️ Shop Unique Products",
          value: "Browse a curated selection of **scripts, models, GFX, and more** from community sellers.\n\n[**Browse the Marketplace →**](https://eclipserblx.com/marketplace)\n\u200B",
          inline: false,
        },
        {
          name: "💰 Become a Seller",
          value: "Turn your skills into income! Join our seller programme and reach **thousands of potential buyers**.\n\n[**Apply to Sell →**](https://eclipserblx.com/become-seller)\n\u200B",
          inline: false,
        },
        {
          name: "🔒 Secure Transactions",
          value: "Every purchase is protected with **secure payment processing** via Stripe.\n\u200B",
          inline: false,
        },
        {
          name: "⭐ Seller Benefits",
          value: "• Keep **85% of sales** (15% platform fee)\n• Build your own **branded storefront**\n• Direct **Discord notifications** for orders\n• Detailed **analytics dashboard**\n\u200B",
          inline: false,
        },
        {
          name: "🚀 Need Help?",
          value: "Questions? Visit our [**Support Page →**](https://eclipserblx.com/support)\n\nJoin our growing community of creators today!",
          inline: false,
        },
      ],
      image: { url: brandingBannerUrl },
      footer: {
        text: "Eclipse Marketplace • Community Sellers",
      },
    };

    // Use bot API if channel ID is configured, otherwise fall back to webhook
    if (channelId) {
      const result = await sendBotMessage(channelId, { embeds: [embed] });

      if (!result.success) {
        return new Response(
          JSON.stringify({ error: "Failed to send Discord message", details: result.error }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Marketplace announcement sent successfully via bot", { messageId: result.messageId });
    } else {
      // Legacy webhook method
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Discord webhook error:", errorText);
        return new Response(
          JSON.stringify({ error: "Failed to send Discord message", details: errorText }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Marketplace announcement sent successfully via webhook");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Marketplace announcement sent to Discord" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending Marketplace announcement:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
