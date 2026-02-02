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

    // Eclipse logo for author icon
    const eclipseLogoUrl = `${storagePublicBase}/store-branding/eclipse-logo.png`;

    const mainEmbed = {
      author: {
        name: "Eclipse+",
        icon_url: eclipseLogoUrl,
      },
      title: "Premium Membership",
      url: "https://eclipserblx.com/eclipse-plus",
      description: "Unlock exclusive benefits and save on every purchase with our premium membership. Join the Eclipse+ family today!",
      color: 0x5865F2, // Discord blurple
      fields: [
        {
          name: "💰 Discount",
          value: "30% off all non-bot products",
          inline: false,
        },
        {
          name: "🎁 Free Product",
          value: "Claim one free product every month",
          inline: false,
        },
        {
          name: "⚡ Discord Role",
          value: "Exclusive Eclipse+ role in our server",
          inline: false,
        },
        {
          name: "💎 Price",
          value: "£3.99/month • Cancel anytime",
          inline: false,
        },
      ],
      footer: {
        text: "View on eclipserblx.com",
      },
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [mainEmbed] }),
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
