import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sendBotMessage, addReaction, buildSettingsMap } from "../_shared/discord-bot.ts";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ECLIPSE_COLOR = 0x8B5CF6;
const SITE_URL = "https://eclipserblx.com";
const PARTNERSHIP_LINK = "https://docs.google.com/document/d/1Xtpx8FAVvj1SkwruuiP0o656hlxLpCqnSEQUj92uzcM/edit?usp=sharing";
const BANNER_URL = "https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/store-branding/9b70ccd6-da02-4d53-8180-e884e1d18b3f/banner-1768958747633.png";
const INSPIRING_BANNER_URL = "https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/store-branding/eclipse-inspiring-banner.png";
const BOT_ID = "1394765283729735720";

/* ── Template definitions ─────────────────────────────────── */

interface Template {
  channelId: string;
  settingsKey?: string; // settings key to store sticky message ID
  buildPayload: () => { embeds: any[]; content?: string };
  addReaction?: string;
  isSticky?: boolean; // if true, delete previous message before sending
}

const TEMPLATES: Record<string, Template> = {
  rules: {
    channelId: "1461353024801869994",
    buildPayload: () => ({
      embeds: [{
        title: "\u26A0 Community Guidelines \u26A0",
        description:
          "**1A: Respect**\nWe expect you to be respectful to everyone, this includes not being discriminative in any way and or generally disrespectful. This also includes threatening other individuals, a group of individuals internally or externally.\n\n" +
          "**1B: Spamming**\nDo not intentionally spam in a channel or channels. Spamming can mean multiple things, spamming images, messages, links, etc.\n\n" +
          "**1C: Advertising**\nNo invasive advertising, whether it being for other communities, streaming platforms, games, scams, etc. Advertise is the necessary channels provided.\n\n" +
          "**1D: Obnoxious Behaviour**\nAnything from being toxic to spreading lies and rumours about someone, something that should not be spread on Discord. This rule also covers raiding our server, violating Discord's Terms of Service and sharing inappropriate / NSFW material.\n\n" +
          "**Ban Appeal Form**\n" +
          `Please use the following link to appeal any bans or moderation action.\n\n[**Contact Us**](${SITE_URL}/contact)`,
        color: ECLIPSE_COLOR,
        image: { url: BANNER_URL },
        timestamp: new Date().toISOString(),
      }],
    }),
    addReaction: "\u2705",
  },

  ads_sticky: {
    channelId: "", // resolved from settings
    settingsKey: "ads_sticky_message_id",
    isSticky: true,
    buildPayload: () => ({
      embeds: [{
        title: "",
        description:
          "\uD83D\uDCE3 Promote your products, servers, or services to the entire Eclipse community! Subscribe to an advertising plan and your ads get posted here automatically.\n\n" +
          `**[Get Started \u2192](${SITE_URL}/advertising)**`,
        color: ECLIPSE_COLOR,
      }],
    }),
  },

  partnership: {
    channelId: "1461353034079666211",
    settingsKey: "partnership_sticky_message_id",
    isSticky: true,
    buildPayload: () => ({
      embeds: [{
        title: "\uD83E\uDD1D Partnership Requests",
        description:
          `Interested in partnering with us?\n\n` +
          `**How to apply:**\nSend a DM to <@${BOT_ID}> with your partnership request.\n\n` +
          `**Before applying, please review our requirements:**\n` +
          `\uD83D\uDCCB **[Partnership Requirements](${PARTNERSHIP_LINK})**`,
        color: ECLIPSE_COLOR,
      }],
    }),
  },

  free_products_rules: {
    channelId: "1475347100240707697",
    buildPayload: () => ({
      embeds: [
        {
          title: "\uD83D\uDCDC Free Products Channel Rules",
          description: "Welcome to **Free Products**! This is a community space where members can share and discover free resources. Please follow these rules to keep things organised and enjoyable for everyone.",
          color: 0x5865f2,
          fields: [
            { name: "1\uFE0F\u20E3 Keep It Free", value: "Everything shared here must be genuinely free \u2014 no paywalls, required purchases, sign-up walls, or bait-and-switch tactics.", inline: false },
            { name: "2\uFE0F\u20E3 No Spam or Duplicate Posts", value: "Do not repost the same item more than once per week. Flooding the channel will result in your posts being removed.", inline: false },
            { name: "3\uFE0F\u20E3 Provide a Clear Description", value: "Include what the product is, what's included, and how to use it. Help others understand what they're downloading.", inline: false },
            { name: "4\uFE0F\u20E3 No Malicious Content", value: "Sharing files containing malware, viruses, or any harmful content will result in an immediate ban.", inline: false },
            { name: "5\uFE0F\u20E3 Be Respectful", value: "Constructive feedback is welcome. Harassment, negativity, or disrespect towards creators will not be tolerated.", inline: false },
            { name: "6\uFE0F\u20E3 Ownership & Licensing", value: "You must own the content you share or have the legal right to distribute it freely. This includes open-source, Creative Commons, or other permissive licences. Sharing copyrighted material without permission is prohibited.", inline: false },
            { name: "\u26A0\uFE0F Violations", value: "Breaking these rules may result in your posts being removed, a warning, or loss of access to this channel.", inline: false },
          ],
        },
        {
          color: 0x5865f2,
          image: { url: "https://roleplay-hub-shop.lovable.app/images/eclipse-banner.png" },
        },
      ],
    }),
  },

  community_relations: {
    channelId: "1460274827918184480",
    buildPayload: () => ({
      embeds: [
        {
          title: "\u2726 COMPANY INFORMATION \u2726",
          description:
            "**ABOUT US**\nAt Eclipse we provide you a safe, secure and trustable marketplace in which you can sell your Roblox Assets on. We promote reliability, sustainability and creativity with our marketplace.\n\nOur marketplace is designed to keep your assets protected with DMCA protection and compliance along with our multiple levels of online security.\n\nAll assets, all ranges and categories, Eclipse Marketplace is the marketplace for you.\n\n" +
            `[JOIN TODAY](${SITE_URL}) - Eclipse`,
          color: ECLIPSE_COLOR,
        },
        {
          title: "\uD83D\uDECD\uFE0F For Buyers",
          description:
            `Discover amazing products from talented creators in our community marketplace.\n\nBrowse a curated selection of **scripts, models, GFX, and more** from community sellers.\n\n[**Browse the Marketplace \u2192**](${SITE_URL}/marketplace)\n\n\uD83D\uDD12 Every purchase is protected with **secure payment processing** via Stripe.`,
          color: ECLIPSE_COLOR,
        },
        {
          title: "\uD83D\uDCB0 For Sellers",
          description:
            `Turn your skills into income! Join our seller programme and reach **thousands of potential buyers**.\n\n[**Apply to Sell \u2192**](${SITE_URL}/become-seller)\n\n\u2B50 **Seller Benefits**\n\u2022 Keep **85% of sales** (15% platform fee)\n\u2022 Build your own **branded storefront**\n\u2022 Direct **Discord notifications** for orders\n\u2022 Detailed **analytics dashboard**\n\n\uD83D\uDE80 Questions? Visit our [**Support Page \u2192**](${SITE_URL}/support)`,
          color: ECLIPSE_COLOR,
        },
        {
          title: "\uD83C\uDFAB Support",
          description:
            `Need help? Our support team is here for you.\n\n\uD83D\uDCE9 **<@${BOT_ID}>** to open a modmail ticket\n\uD83C\uDF9F\uFE0F [**Submit a Ticket \u2192**](${SITE_URL}/support/tickets)\n\u2753 [**Browse FAQ \u2192**](${SITE_URL}/faq)\n\uD83D\uDE80 [**Support Page \u2192**](${SITE_URL}/support)\n\nOur staff aim to respond within **24 hours**.`,
          color: ECLIPSE_COLOR,
        },
        {
          title: "\u2709 COMMUNITY RELATIONS \u2709",
          description:
            `**[ECLIPSE TERMS OF SERVICE](${SITE_URL}/terms)**\n\n**[ECLIPSE REFUND POLICY](${SITE_URL}/refund-policy)**\n\n**[ECLIPSE PRIVACY POLICY](${SITE_URL}/privacy)**\n\n**[ECLIPSE DMCA / IP POLICY](${SITE_URL}/dmca)**\n\n**[ECLIPSE MARKETPLACE](${SITE_URL})**\n\n**[PARTNERSHIP REQUIREMENTS](${PARTNERSHIP_LINK})**\n\n**[ECLIPSE JOBS](${SITE_URL}/careers)**\n\n**[ECLIPSE FAQ](${SITE_URL}/faq)**`,
          color: ECLIPSE_COLOR,
          image: { url: INSPIRING_BANNER_URL },
        },
      ],
    }),
    addReaction: "\u2705",
  },
};

/* ── Handler ──────────────────────────────────────────────── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders }
  const _unauth = requireServiceRole(req, corsHeaders);
  if (_unauth) return _unauth;
);
  }

  try {
    let template = "ads_sticky";
    let force = false;

    try {
      const body = await req.json();
      if (body?.template) template = body.template;
      if (body?.force === true) force = true;
    } catch { /* no body — default to ads_sticky */ }

    const tmpl = TEMPLATES[template];
    if (!tmpl) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${template}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!botToken) throw new Error("DISCORD_CUSTOMER_BOT_TOKEN not configured");

    // Resolve channel ID — for ads_sticky, read from settings
    let channelId = tmpl.channelId;
    if (template === "ads_sticky") {
      const { data: settings } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["advertisements_discord_channel_id"]);
      const settingsMap = buildSettingsMap(settings);
      channelId = settingsMap["advertisements_discord_channel_id"];
      if (!channelId) {
        return new Response(
          JSON.stringify({ error: "advertisements_discord_channel_id not configured" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // For sticky templates — handle dedup and old message deletion
    if (tmpl.isSticky && tmpl.settingsKey) {
      const { data: stickyRecord } = await supabase
        .from("settings")
        .select("value")
        .eq("key", tmpl.settingsKey)
        .maybeSingle();

      const currentStickyId = stickyRecord?.value
        ? (typeof stickyRecord.value === "string"
            ? stickyRecord.value.replace(/^"|"$/g, "")
            : String(stickyRecord.value))
        : null;

      // For partnership sticky — check if we need to send
      if (template === "partnership" && !force) {
        const messagesRes = await fetch(
          `https://discord.com/api/v10/channels/${channelId}/messages?limit=5`,
          { headers: { Authorization: `Bot ${botToken}` } }
        );
        if (messagesRes.ok) {
          const messages = await messagesRes.json();
          const now = Date.now();
          const tenMinutesAgo = now - 10 * 60 * 1000;
          const twentyMinutesAgo = now - 20 * 60 * 1000;

          const hasRecentPost = messages.some((msg: any) => {
            if (msg.id === currentStickyId) return false;
            if (msg.author?.bot) return false;
            const msgTime = new Date(msg.timestamp).getTime();
            return msgTime > twentyMinutesAgo && msgTime <= tenMinutesAgo;
          });

          if (!hasRecentPost) {
            return new Response(
              JSON.stringify({ success: true, action: "skipped", reason: "no recent posts" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          if (messages.length > 0 && messages[0].id === currentStickyId) {
            return new Response(
              JSON.stringify({ success: true, action: "skipped", reason: "sticky already latest" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      // Delete old sticky message
      if (currentStickyId) {
        try {
          await fetch(
            `https://discord.com/api/v10/channels/${channelId}/messages/${currentStickyId}`,
            { method: "DELETE", headers: { Authorization: `Bot ${botToken}` } }
          );
          console.log(`[send-discord-embed:${template}] Deleted old sticky: ${currentStickyId}`);
        } catch (e) {
          console.log(`[send-discord-embed:${template}] Could not delete old sticky:`, e);
        }
      }
    }

    // Send the message
    const payload = tmpl.buildPayload();
    const result = await sendBotMessage(channelId, payload);

    if (!result.success) {
      throw new Error(result.error || "Failed to send message");
    }

    // Store sticky message ID
    if (tmpl.isSticky && tmpl.settingsKey && result.messageId) {
      await supabase
        .from("settings")
        .upsert({ key: tmpl.settingsKey, value: JSON.stringify(result.messageId) }, { onConflict: "key" });

      // For ads sticky, also reset counter
      if (template === "ads_sticky") {
        await supabase
          .from("settings")
          .upsert({ key: "ads_since_last_sticky", value: JSON.stringify("0") }, { onConflict: "key" });
      }
    }

    // Add reaction if configured
    if (tmpl.addReaction && result.messageId) {
      await addReaction(channelId, result.messageId, tmpl.addReaction);
    }

    console.log(`[send-discord-embed:${template}] Sent: ${result.messageId}`);

    return new Response(
      JSON.stringify({ success: true, template, messageId: result.messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[send-discord-embed] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
