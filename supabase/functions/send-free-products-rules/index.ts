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
          "Welcome to the **Free Products** channel! This is a space for verified sellers to share free resources with the community. Please follow these rules to keep things fair and useful for everyone.",
        color: 0x5865f2,
        fields: [
          {
            name: "1️⃣ Verified Sellers Only",
            value: "Only verified store owners may post free products here. All items must be listed on your store with a £0.00 price.",
            inline: false,
          },
          {
            name: "2️⃣ No Spam or Repeat Posts",
            value: "Do not repost the same product more than once per week. Excessive posting will result in removal from the channel.",
            inline: false,
          },
          {
            name: "3️⃣ Quality Standards Apply",
            value: "Free products must still meet our marketplace quality and moderation standards. Low-effort or placeholder items will be removed.",
            inline: false,
          },
          {
            name: "4️⃣ No Bait & Switch",
            value: "Products posted here must be genuinely free — no hidden paywalls, required purchases, or misleading descriptions.",
            inline: false,
          },
          {
            name: "5️⃣ Include a Description",
            value: "Provide a clear description of what the product is and what's included. Help the community understand what they're downloading.",
            inline: false,
          },
          {
            name: "6️⃣ No Self-Promotion Spam",
            value: "You may link to your store, but do not use this channel purely to advertise paid products. The focus should be on the free item.",
            inline: false,
          },
          {
            name: "7️⃣ Be Respectful",
            value: "Constructive feedback is welcome. Harassment, negativity, or disrespectful comments towards creators will not be tolerated.",
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
