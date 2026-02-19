import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sendBotMessage } from "../_shared/discord-bot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHANNEL_ID = "1461353034079666211";
const BOT_ID = "1394765283729735720";
const PARTNERSHIP_LINK = "https://docs.google.com/document/d/1Xtpx8FAVvj1SkwruuiP0o656hlxLpCqnSEQUj92uzcM/edit?usp=sharing";
const ECLIPSE_COLOR = 0x8B5CF6;
const SETTINGS_KEY = "partnership_sticky_message_id";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Parse request body for force flag
  let force = false;
  try {
    const body = await req.json();
    force = body?.force === true;
  } catch { /* no body */ }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!botToken) {
      throw new Error("DISCORD_CUSTOMER_BOT_TOKEN not configured");
    }

    // Check if there are any messages in the last 10 minutes (besides our own sticky)
    const messagesRes = await fetch(
      `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=5`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );

    if (!messagesRes.ok) {
      throw new Error(`Failed to fetch channel messages: ${messagesRes.status}`);
    }

    const messages = await messagesRes.json();
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;
    const twentyMinutesAgo = now - 20 * 60 * 1000;

    // Get the current sticky message ID
    const { data: stickyRecord } = await supabase
      .from("settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    const currentStickyId = stickyRecord?.value
      ? (typeof stickyRecord.value === "string"
          ? stickyRecord.value.replace(/^"|"$/g, "")
          : String(stickyRecord.value))
      : null;

    // Check if there's a non-bot message posted between 10-20 minutes ago
    // (meaning it was posted ~10 min ago and we should now send the sticky)
    const hasRecentPost = messages.some((msg: any) => {
      if (msg.id === currentStickyId) return false; // Skip our sticky
      if (msg.author?.bot) return false; // Skip bot messages
      const msgTime = new Date(msg.timestamp).getTime();
      return msgTime > twentyMinutesAgo && msgTime <= tenMinutesAgo;
    });

    if (!hasRecentPost && !force) {
      console.log("[PARTNERSHIP-STICKY] No qualifying posts found, skipping");
      return new Response(
        JSON.stringify({ success: true, action: "skipped", reason: "no recent posts" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the most recent message is already our sticky (avoid duplicates)
    if (messages.length > 0 && messages[0].id === currentStickyId && !force) {
      console.log("[PARTNERSHIP-STICKY] Sticky is already the latest message, skipping");
      return new Response(
        JSON.stringify({ success: true, action: "skipped", reason: "sticky already latest" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete old sticky message
    if (currentStickyId) {
      try {
        await fetch(
          `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages/${currentStickyId}`,
          { method: "DELETE", headers: { Authorization: `Bot ${botToken}` } }
        );
        console.log("[PARTNERSHIP-STICKY] Deleted old sticky:", currentStickyId);
      } catch (e) {
        console.log("[PARTNERSHIP-STICKY] Could not delete old sticky (may already be gone):", e);
      }
    }

    // Send new sticky message
    const result = await sendBotMessage(CHANNEL_ID, {
      embeds: [
        {
          title: "🤝 Partnership Requests",
          description:
            `Interested in partnering with us?\n\n` +
            `**How to apply:**\n` +
            `Send a DM to <@${BOT_ID}> with your partnership request.\n\n` +
            `**Before applying, please review our requirements:**\n` +
            `📋 **[Partnership Requirements](${PARTNERSHIP_LINK})**`,
          color: ECLIPSE_COLOR,
        },
      ],
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send sticky message");
    }

    // Store new message ID
    await supabase
      .from("settings")
      .upsert(
        { key: SETTINGS_KEY, value: JSON.stringify(result.messageId) },
        { onConflict: "key" }
      );

    console.log("[PARTNERSHIP-STICKY] Sent new sticky:", result.messageId);

    return new Response(
      JSON.stringify({ success: true, action: "sent", messageId: result.messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[PARTNERSHIP-STICKY] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
