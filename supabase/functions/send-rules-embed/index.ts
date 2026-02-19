import { sendBotMessage, addReaction } from "../_shared/discord-bot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHANNEL_ID = "1461353024801869994";
const ECLIPSE_COLOR = 0x8B5CF6;
const SITE_URL = "https://eclipserblx.com";
const BANNER_URL = "https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/store-branding/9b70ccd6-da02-4d53-8180-e884e1d18b3f/banner-1768958747633.png";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const result = await sendBotMessage(CHANNEL_ID, {
      embeds: [
        {
          title: "\u26A0 Community Guidelines \u26A0",
          description:
            "**1A: Respect**\n" +
            "We expect you to be respectful to everyone, this includes not being discriminative in any way and or generally disrespectful. This also includes threatening other individuals, a group of individuals internally or externally.\n\n" +
            "**1B: Spamming**\n" +
            "Do not intentionally spam in a channel or channels. Spamming can mean multiple things, spamming images, messages, links, etc.\n\n" +
            "**1C: Advertising**\n" +
            "No invasive advertising, whether it being for other communities, streaming platforms, games, scams, etc. Advertise is the necessary channels provided.\n\n" +
            "**1D: Obnoxious Behaviour**\n" +
            "Anything from being toxic to spreading lies and rumours about someone, something that should not be spread on Discord. This rule also covers raiding our server, violating Discord's Terms of Service and sharing inappropriate / NSFW material.\n\n" +
            "**Ban Appeal Form**\n" +
            `Please use the following link to appeal any bans or moderation action.\n\n[**Contact Us**](${SITE_URL}/contact)`,
          color: ECLIPSE_COLOR,
          image: {
            url: BANNER_URL,
          },
          footer: {
            text: "Eclipse Marketplace • Community Guidelines",
          },
          timestamp: new Date().toISOString(),
        },
      ],
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send rules embed");
    }

    if (result.messageId) {
      await addReaction(CHANNEL_ID, result.messageId, "✅");
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[RULES-EMBED] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
