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
    // Get settings from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["affiliate_commission_rate", "affiliate_minimum_payout", "affiliate_cookie_days", "affiliate_discord_channel_id", "affiliate_discord_webhook_url"])
      .order("key");

    const settingsMap = buildSettingsMap(settings);

    const channelId = settingsMap["affiliate_discord_channel_id"];
    const webhookUrl = settingsMap["affiliate_discord_webhook_url"];
    
    if (!channelId && !webhookUrl) {
      console.error("Affiliate Discord channel ID or webhook URL not configured in settings");
      return new Response(
        JSON.stringify({ error: "Affiliate Discord not configured. Please set channel ID or webhook URL in Admin → Discord Settings → Affiliate tab." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const commissionRate = settingsMap["affiliate_commission_rate"] || "10";
    const minimumPayout = settingsMap["affiliate_minimum_payout"] || "10";
    const cookieDays = settingsMap["affiliate_cookie_days"] || "30";

    console.log("Sending affiliate announcement with settings:", { commissionRate, minimumPayout, cookieDays });
    
    // Eclipse branding banner - always included at the bottom of announcements
    const brandingBannerUrl = "https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/store-branding/eclipse-discord-banner.png";

    const embed = {
      title: "💼 Affiliate Programme",
      description: "Join our Affiliate Programme and earn commission on every sale you refer. It's simple, transparent, and rewarding.\n\n━━━━━━━━━━━━━━━━━━━━━━",
      color: 0x5865F2, // Discord blurple for professional look
      fields: [
        {
          name: "📈 Commission Rate",
          value: `Earn **${commissionRate}%** commission on every successful purchase made through your unique referral link.\n\u200B`,
          inline: false,
        },
        {
          name: "👥 Who Can Join?",
          value: "• Content creators & streamers\n• Discord community owners\n• Social media influencers\n• Anyone with an audience\n\u200B",
          inline: false,
        },
        {
          name: "🚀 Getting Started",
          value: "**1.** Create a free account on our website\n**2.** Navigate to the **Earn** section\n**3.** Copy your unique referral link\n**4.** Share with your audience\n\u200B",
          inline: false,
        },
        {
          name: "📊 Real-Time Analytics",
          value: `Track your performance with detailed statistics:\n• Total link clicks\n• Sign-up conversions\n• Pending & confirmed earnings\n\nYour referral cookie is valid for **${cookieDays} days**, ensuring you receive credit for delayed purchases.\n\u200B`,
          inline: false,
        },
        {
          name: "💳 Payouts",
          value: `Request a payout once you reach the **£${minimumPayout}** minimum threshold. Payments are processed via **Stripe Connect** (automatic) or **PayPal** (manual).\n\u200B`,
          inline: false,
        },
        {
          name: "🔗 Join Now",
          value: "[**Click here to get started →**](https://eclipserblx.com/affiliate)\n\nIf you have any questions, feel free to reach out to our support team.",
          inline: false,
        },
      ],
      image: { url: brandingBannerUrl },
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

      console.log("Affiliate announcement sent successfully via bot", { messageId: result.messageId });
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

      console.log("Affiliate announcement sent successfully via webhook");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Affiliate programme announcement sent to Discord" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending affiliate announcement:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
