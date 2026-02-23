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
    const INSPIRING_BANNER_URL = "https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/store-branding/eclipse-inspiring-banner.png";

    const result = await sendBotMessage(CHANNEL_ID, {
      embeds: [
        {
          title: "✦ COMPANY INFORMATION ✦",
          description:
            "**ABOUT US**\n" +
            "At Eclipse we provide you a safe, secure and trustable marketplace in which you can sell your Roblox Assets on. We promote reliability, sustainability and creativity with our marketplace.\n\n" +
            "Our marketplace is designed to keep your assets protected with DMCA protection and compliance along with our multiple levels of online security.\n\n" +
            "All assets, all ranges and categories, Eclipse Marketplace is the marketplace for you.\n\n" +
            `[JOIN TODAY](${SITE_URL}) - Eclipse`,
          color: ECLIPSE_COLOR,
        },
        {
          title: "🛍️ For Buyers",
          description:
            "Discover amazing products from talented creators in our community marketplace.\n\n" +
            "Browse a curated selection of **scripts, models, GFX, and more** from community sellers.\n\n" +
            `[**Browse the Marketplace →**](${SITE_URL}/marketplace)\n\n` +
            "🔒 Every purchase is protected with **secure payment processing** via Stripe.",
          color: ECLIPSE_COLOR,
        },
        {
          title: "💰 For Sellers",
          description:
            "Turn your skills into income! Join our seller programme and reach **thousands of potential buyers**.\n\n" +
            `[**Apply to Sell →**](${SITE_URL}/become-seller)\n\n` +
            "⭐ **Seller Benefits**\n" +
            "• Keep **85% of sales** (15% platform fee)\n" +
            "• Build your own **branded storefront**\n" +
            "• Direct **Discord notifications** for orders\n" +
            "• Detailed **analytics dashboard**\n\n" +
            `🚀 Questions? Visit our [**Support Page →**](${SITE_URL}/support)`,
          color: ECLIPSE_COLOR,
        },
        {
          title: "🎫 Support",
          description:
            "Need help? Our support team is here for you.\n\n" +
            `📩 **DM this bot** to open a modmail ticket\n` +
            `🎟️ [**Submit a Ticket →**](${SITE_URL}/support/tickets)\n` +
            `❓ [**Browse FAQ →**](${SITE_URL}/faq)\n\n` +
            "Our staff aim to respond within **24 hours**.",
          color: ECLIPSE_COLOR,
        },
        {
          title: "✉ COMMUNITY RELATIONS ✉",
          description:
            `**[ECLIPSE TERMS OF SERVICE](${SITE_URL}/terms)**\n\n` +
            `**[ECLIPSE REFUND POLICY](${SITE_URL}/refund-policy)**\n\n` +
            `**[ECLIPSE PRIVACY POLICY](${SITE_URL}/privacy)**\n\n` +
            `**[ECLIPSE DMCA / IP POLICY](${SITE_URL}/dmca)**\n\n` +
            `**[ECLIPSE MARKETPLACE](${SITE_URL})**\n\n` +
            `**[PARTNERSHIP REQUIREMENTS](https://docs.google.com/document/d/1Xtpx8FAVvj1SkwruuiP0o656hlxLpCqnSEQUj92uzcM/edit?usp=sharing)**\n\n` +
            `**[ECLIPSE JOBS](${SITE_URL}/careers)**\n\n` +
            `**[ECLIPSE FAQ](${SITE_URL}/faq)**`,
          color: ECLIPSE_COLOR,
          image: { url: INSPIRING_BANNER_URL },
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
