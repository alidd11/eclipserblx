import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adId } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      if (userData?.user) {
        const { data: roles } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id);
        const isStaff = roles?.some(r => ["admin", "staff", "moderator", "support"].includes(r.role));
        if (!isStaff) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: corsHeaders });
        }
      }
    }

    // Fetch the ad
    const { data: ad, error: adError } = await supabaseAdmin
      .from("discord_advertisements")
      .select("*")
      .eq("id", adId)
      .single();

    if (adError || !ad) {
      return new Response(JSON.stringify({ error: "Ad not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get settings
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("key, value")
      .in("key", ["advertisements_discord_webhook_url", "advertisements_discord_channel_id"]);

    const settingsMap: Record<string, string> = {};
    for (const s of settings ?? []) {
      settingsMap[s.key] = typeof s.value === "string" ? s.value.replace(/"/g, "") : String(s.value);
    }

    const webhookUrl = settingsMap["advertisements_discord_webhook_url"];
    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: "Webhook not configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Try to delete the old message if we have its ID
    const oldMessageId = ad.discord_message_id;
    if (oldMessageId) {
      try {
        await fetch(`${webhookUrl}/messages/${oldMessageId}`, { method: "DELETE" });
        console.log("Deleted old message:", oldMessageId);
      } catch (e) {
        console.warn("Could not delete old message:", e);
      }
    }

    // Extract and strip [View Image](url) markdown links from description
    // Discord plain text doesn't render markdown hyperlinks
    const markdownLinkRegex = /\[View Image\]\((https?:\/\/[^\)]+)\)/gi;
    let extractedImageUrl = ad.image_url || null;
    const cleanDescription = ad.description.replace(markdownLinkRegex, (_, url) => {
      if (!extractedImageUrl) extractedImageUrl = url.trim();
      return ''; // remove from description
    }).replace(/\n{3,}/g, '\n\n').trim(); // clean up excess blank lines

    // Also strip any bare [text](url) markdown links since they don't work in plain text
    const anyMarkdownLink = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    const fullyCleanDescription = cleanDescription.replace(anyMarkdownLink, (_, text, url) => url);

    // Get subscription tier for footer
    const { data: subscription } = await supabaseAdmin
      .from("advertisement_subscriptions")
      .select("tier")
      .eq("user_id", ad.user_id)
      .eq("status", "active")
      .maybeSingle();

    const tier = subscription?.tier || "basic";
    const tierLabel = `Eclipse Ads ${tier.charAt(0).toUpperCase() + tier.slice(1)}`;
    const footerLine = ad.discord_username
      ? `*Sponsored • @${ad.discord_username} • ${tierLabel}*`
      : `*Sponsored • ${tierLabel}*`;

    // Build ping content
    let pingPrefix = "";
    if (ad.ping_type === "everyone") pingPrefix = "@everyone\n";
    else if (ad.ping_type === "here") pingPrefix = "@here\n";

    // Helper: shorten a URL via TinyURL free API
    const shortenUrl = async (url: string): Promise<string> => {
      try {
        const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const short = (await res.text()).trim();
          if (short.startsWith('http')) return short;
        }
      } catch { /* fall through */ }
      return url;
    };

    // Build plain text message using cleaned description
    let plainText = `${pingPrefix}📢 **${ad.title}**\n\n${fullyCleanDescription}`;
    if (ad.link_url) {
      // Only shorten the link URL (not images — raw URLs needed for Discord auto-embed)
      const shortLink = await shortenUrl(ad.link_url);
      plainText += `\n\n🔗 ${shortLink}`;
    }
    // Post raw image URL so Discord auto-embeds it as an inline image
    // NOTE: URL must end with an image extension (.jpg/.png) for Discord to embed it
    if (extractedImageUrl) plainText += `\n${extractedImageUrl}`;
    plainText += `\n\n${footerLine}`;
    // Enforce Discord's 2000 char limit
    if (plainText.length > 2000) plainText = plainText.substring(0, 1997) + '...';

    // Post to Discord
    const discordRes = await fetch(webhookUrl + "?wait=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: plainText }),
    });

    if (!discordRes.ok) {
      const err = await discordRes.text();
      return new Response(JSON.stringify({ error: `Discord error: ${err}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const discordResult = await discordRes.json();
    const newMessageId = discordResult?.id || null;

    // Update the ad record with new message ID and timestamp
    await supabaseAdmin
      .from("discord_advertisements")
      .update({
        status: "posted",
        posted_at: new Date().toISOString(),
        discord_message_id: newMessageId,
      })
      .eq("id", adId);

    return new Response(JSON.stringify({ success: true, messageId: newMessageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
