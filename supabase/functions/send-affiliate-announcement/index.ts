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
    const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
    
    if (!webhookUrl) {
      console.error("DISCORD_WEBHOOK_URL not configured");
      return new Response(
        JSON.stringify({ error: "Discord webhook not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get affiliate settings from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: settings } = await supabase
      .from("settings")
      .select("value")
      .in("key", ["affiliate_commission_rate", "affiliate_minimum_payout", "affiliate_cookie_days"])
      .order("key");

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key?: string; value: string }) => {
      if (s.key) settingsMap[s.key] = s.value;
    });

    const commissionRate = settingsMap["affiliate_commission_rate"] || "10";
    const minimumPayout = settingsMap["affiliate_minimum_payout"] || "10";
    const cookieDays = settingsMap["affiliate_cookie_days"] || "30";

    const embed = {
      title: "🚀 EARN MONEY WITH US! 💸",
      description: "**Hey fam!** 👋\n\nWe're all about building this community together — and now YOU can get paid for being part of it!\n\nIntroducing our **Affiliate Programme** where you earn **real cash** just for spreading the word! 🔥",
      color: 0x00D26A, // Vibrant green for money/success
      fields: [
        {
          name: "💰 EARN " + commissionRate + "% ON EVERY SALE",
          value: "That's right — every time someone buys through YOUR link, you get paid. No cap, no limits. The more you share, the more you make!",
          inline: false,
        },
        {
          name: "🎮 PERFECT FOR:",
          value: "• Content creators & streamers\n• Discord server owners\n• Social media influencers\n• Or literally ANYONE with friends!",
          inline: false,
        },
        {
          name: "⚡ HOW EASY IS IT?",
          value: "1️⃣ Create an account (free!)\n2️⃣ Grab your unique link from the **Earn** tab\n3️⃣ Share it anywhere — Discord, Twitter, TikTok, wherever!\n4️⃣ Watch the money roll in 💵",
          inline: false,
        },
        {
          name: "📊 FULL TRANSPARENCY",
          value: `Track everything in real-time:\n• Link clicks\n• Sign-ups\n• Conversion rate\n• Your earnings\n\n**Cookie lasts ${cookieDays} days** — so even if they buy later, you still get paid!`,
          inline: false,
        },
        {
          name: "💳 CASH OUT ANYTIME",
          value: `Hit **$${minimumPayout}** and request your payout instantly via PayPal. It's YOUR money, get it when you want it!`,
          inline: false,
        },
        {
          name: "🤝 LET'S GROW TOGETHER",
          value: "This isn't just about making money — it's about building something awesome as a community. When you win, we ALL win!\n\n**Ready to start earning?** Sign up now and check out the Earn section! 🎯",
          inline: false,
        },
      ],
      footer: {
        text: "💜 Thanks for being part of the fam — let's get this bread together!",
      },
      timestamp: new Date().toISOString(),
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

    console.log("Affiliate announcement sent successfully");

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
