const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHANNEL_ID = "1475347100240707697";
const DISCORD_API_BASE = "https://discord.com/api/v10";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
    if (!botToken) throw new Error("DISCORD_CUSTOMER_BOT_TOKEN not configured");

    const embeds = [
      {
        title: "📜 Free Products Channel Rules",
        description:
          "Welcome to **Free Products**! This is a community space where members can share and discover free resources. Please follow these rules to keep things organised and enjoyable for everyone.",
        color: 0x5865f2,
        fields: [
          {
            name: "1️⃣ Keep It Free",
            value: "Everything shared here must be genuinely free — no paywalls, required purchases, sign-up walls, or bait-and-switch tactics.",
            inline: false,
          },
          {
            name: "2️⃣ No Spam or Duplicate Posts",
            value: "Do not repost the same item more than once per week. Flooding the channel will result in your posts being removed.",
            inline: false,
          },
          {
            name: "3️⃣ Provide a Clear Description",
            value: "Include what the product is, what's included, and how to use it. Help others understand what they're downloading.",
            inline: false,
          },
          {
            name: "4️⃣ Credit the Creator",
            value: "If sharing something you didn't make, always credit the original creator and ensure you have permission to share it.",
            inline: false,
          },
          {
            name: "5️⃣ No Malicious Content",
            value: "Sharing files containing malware, viruses, or any harmful content will result in an immediate ban.",
            inline: false,
          },
          {
            name: "6️⃣ Be Respectful",
            value: "Constructive feedback is welcome. Harassment, negativity, or disrespect towards creators will not be tolerated.",
            inline: false,
          },
          {
            name: "7️⃣ No Excessive Self-Promotion",
            value: "You may mention your store or socials, but the focus should be on the free item — not advertising paid products.",
            inline: false,
          },
          {
            name: "⚠️ Violations",
            value: "Breaking these rules may result in your posts being removed, a warning, or loss of access to this channel.",
            inline: false,
          },
        ],
      },
    ];

    const response = await fetch(`${DISCORD_API_BASE}/channels/${CHANNEL_ID}/threads`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "📜 Free Products Channel Rules",
        message: { embeds },
        auto_archive_duration: 10080,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify({ success: true, message_id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[send-free-products-rules] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
