import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Fetch Eclipse+ webhook URL from settings
    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["eclipse_plus_discord_webhook_url"])
      .order("key");

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => {
      const val = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : s.value;
      settingsMap[s.key] = val;
    });

    const webhookUrl = settingsMap["eclipse_plus_discord_webhook_url"];
    
    if (!webhookUrl) {
      console.error("Eclipse+ Discord webhook URL not configured in settings");
      return new Response(
        JSON.stringify({ error: "Eclipse+ Discord webhook not configured. Please set it in Admin → Discord Settings → Eclipse+ tab." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending Eclipse+ announcement...");
    
    const storagePublicBase = `${supabaseUrl}/storage/v1/object/public`;

    // Eclipse branding banner
    const brandingBannerUrl = `${storagePublicBase}/store-branding/eclipse-discord-banner.png`;

    // Eclipse+ banner: use a NEW filename + ?v= cache bust to defeat Discord CDN caching
    const eclipsePlusBannerObject = "eclipse-plus-banner-wide-v3.png";
    const eclipsePlusCacheBust = "2026-01-27-v3";
    const eclipsePlusBannerUrl = `${storagePublicBase}/store-branding/${eclipsePlusBannerObject}?v=${encodeURIComponent(eclipsePlusCacheBust)}`;

    const mainEmbed = {
      title: "✨ Eclipse+ Membership",
      description: "Unlock exclusive benefits and save on every purchase with our premium membership. Join the Eclipse+ family today!\n\n━━━━━━━━━━━━━━━━━━━━━━",
      color: 0xFFD700, // Gold for premium feel
      fields: [
        {
          name: "💰 30% Discount",
          value: "Enjoy **30% off** all non-bot products in our store. The savings add up fast!\n\u200B",
          inline: false,
        },
        {
          name: "🎁 Monthly Free Product",
          value: "Claim **one free product** every month — exclusively for Eclipse+ members.\n\u200B",
          inline: false,
        },
        {
          name: "🏷️ Member Pricing",
          value: "See your exclusive **member prices** displayed throughout the store with gold badges.\n\u200B",
          inline: false,
        },
        {
          name: "⚡ Discord Role",
          value: "Link your Discord and receive the exclusive **Eclipse+** role in our server automatically.\n\u200B",
          inline: false,
        },
        {
          name: "💎 Only £4.99/month",
          value: "Get all these benefits for just **£4.99** per month. Cancel anytime.\n\u200B",
          inline: false,
        },
        {
          name: "🚀 Get Started",
          value: "[**Subscribe to Eclipse+ →**](https://eclipserblx.com/eclipse-plus)\n\nQuestions? Reach out to our support team anytime.",
          inline: false,
        },
      ],
      image: { url: brandingBannerUrl },
      footer: {
        text: "Eclipse+ Membership • Premium Benefits",
      },
    };

    // Second embed with just the Eclipse+ banner image (same width)
    const bannerEmbed = {
      color: 0xFFD700,
      image: { url: eclipsePlusBannerUrl },
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [mainEmbed, bannerEmbed] }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Discord webhook error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send Discord message", details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Eclipse+ announcement sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Eclipse+ announcement sent to Discord" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending Eclipse+ announcement:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
