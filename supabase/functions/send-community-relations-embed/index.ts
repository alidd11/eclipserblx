import { sendBotMessage, addReaction } from "../_shared/discord-bot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHANNEL_ID = "1460274827918184480";
const ECLIPSE_COLOR = 0x8B5CF6;
const SITE_URL = "https://eclipserblx.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const result = await sendBotMessage(CHANNEL_ID, {
      embeds: [
        {
          title: "✉ Community Relations ✉",
          description:
            `**Eclipse Terms of Service**\n[Click Here](${SITE_URL}/terms)\n\n` +
            `**Eclipse Refund Policy**\n[Click Here](${SITE_URL}/refund-policy)\n\n` +
            `**Eclipse Privacy Policy**\n[Click Here](${SITE_URL}/privacy)\n\n` +
            `**Eclipse DMCA / IP Policy**\n[Click Here](${SITE_URL}/dmca)\n\n` +
            `**Eclipse Marketplace**\n[Click Here](${SITE_URL})\n\n` +
            `**Partnership Requirements**\n[Click Here](https://docs.google.com/document/d/1Xtpx8FAVvj1SkwruuiP0o656hlxLpCqnSEQUj92uzcM/edit?usp=sharing)\n\n` +
            `**Eclipse Jobs**\n[Click Here](${SITE_URL}/careers)\n\n` +
            `**Eclipse FAQ**\n[Click Here](${SITE_URL}/faq)`,
          color: ECLIPSE_COLOR,
        },
      ],
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send embed");
    }

    // Add ✅ reaction
    if (result.messageId) {
      await addReaction(CHANNEL_ID, result.messageId, "✅");
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[COMMUNITY-RELATIONS] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
