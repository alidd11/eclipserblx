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

    // Fetch Marketplace webhook URL from settings
    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["marketplace_discord_webhook_url"])
      .order("key");

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => {
      const val = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : s.value;
      settingsMap[s.key] = val;
    });

    const webhookUrl = settingsMap["marketplace_discord_webhook_url"];
    
    if (!webhookUrl) {
      console.error("Marketplace Discord webhook URL not configured in settings");
      return new Response(
        JSON.stringify({ error: "Marketplace Discord webhook not configured. Please set it in Admin → Discord Settings → Marketplace tab." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending Marketplace announcement...");

    const embed = {
      title: "🏪 Eclipse Marketplace",
      description: "Discover amazing products from talented creators in our community marketplace. Buy, sell, and connect with fellow Roblox developers!\n\n━━━━━━━━━━━━━━━━━━━━━━",
      color: 0x9b59b6, // Purple for marketplace theme
      fields: [
        {
          name: "🛍️ Shop Unique Products",
          value: "Browse a curated selection of **scripts, models, GFX, and more** from verified community sellers.\n\u200B",
          inline: false,
        },
        {
          name: "💰 Become a Seller",
          value: "Turn your skills into income! Join our seller programme and reach **thousands of potential buyers**.\n\u200B",
          inline: false,
        },
        {
          name: "✅ Verified Quality",
          value: "All marketplace products are reviewed to ensure **quality and safety** for buyers.\n\u200B",
          inline: false,
        },
        {
          name: "🔒 Secure Transactions",
          value: "Every purchase is protected with **secure payment processing** and buyer protection.\n\u200B",
          inline: false,
        },
        {
          name: "⭐ Seller Benefits",
          value: "• Keep **85% of sales** (15% platform fee)\n• Build your own **branded storefront**\n• Direct **Discord notifications** for orders\n• Detailed **analytics dashboard**\n\u200B",
          inline: false,
        },
        {
          name: "🚀 Get Started",
          value: "[**Browse the Marketplace →**](https://roleplay-hub-shop.lovable.app/marketplace)\n[**Become a Seller →**](https://roleplay-hub-shop.lovable.app/become-seller)\n\nJoin our growing community of creators today!",
          inline: false,
        },
      ],
      thumbnail: {
        url: "https://cdn.discordapp.com/emojis/1084184853853491200.webp", // Store emoji
      },
      footer: {
        text: "Eclipse Marketplace • Community Creations",
      },
    };

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

    console.log("Marketplace announcement sent successfully");

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
