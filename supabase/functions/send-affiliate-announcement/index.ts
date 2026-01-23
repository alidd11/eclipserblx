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
      title: "💰 Affiliate Programme",
      description: "Join our affiliate programme and start earning money by sharing products you love!",
      color: 0x7C3AED, // Purple color
      fields: [
        {
          name: "🎯 How It Works",
          value: "1. Sign up for an account\n2. Go to the **Earn** section in your dashboard\n3. Copy your unique referral link\n4. Share it with friends and followers\n5. Earn commission on every sale!",
          inline: false,
        },
        {
          name: "💵 Commission Rate",
          value: `**${commissionRate}%** on every sale`,
          inline: true,
        },
        {
          name: "📅 Cookie Duration",
          value: `**${cookieDays} days** tracking`,
          inline: true,
        },
        {
          name: "💳 Minimum Payout",
          value: `**$${minimumPayout}** via PayPal`,
          inline: true,
        },
        {
          name: "📊 Track Your Performance",
          value: "• View link clicks in real-time\n• Track signups from your referrals\n• Monitor your conversion rate\n• See all your earnings and payouts",
          inline: false,
        },
        {
          name: "✨ Why Join?",
          value: "• **Passive income** - Earn while you sleep\n• **No limits** - Unlimited earning potential\n• **Easy payouts** - Request anytime you hit minimum\n• **Real-time stats** - Full transparency on performance",
          inline: false,
        },
      ],
      footer: {
        text: "Start earning today! Sign up and visit the Earn section.",
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
