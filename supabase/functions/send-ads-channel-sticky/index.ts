import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sendBotMessage, buildSettingsMap } from "../_shared/discord-bot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ECLIPSE_COLOR = 0x8B5CF6;
const ECLIPSE_ICON = "https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/product-images/eclipse-logo.png";
const SITE_URL = "https://eclipserblx.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the advertisements channel ID from settings
    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["advertisements_discord_channel_id"]);

    const settingsMap = buildSettingsMap(settings);
    const channelId = settingsMap["advertisements_discord_channel_id"];

    if (!channelId) {
      return new Response(
        JSON.stringify({ error: "advertisements_discord_channel_id not configured in settings" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete the previous sticky message if we stored its ID
    const { data: stickyRecord } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "ads_sticky_message_id")
      .maybeSingle();

    if (stickyRecord?.value) {
      const oldMessageId = typeof stickyRecord.value === "string" 
        ? stickyRecord.value.replace(/^"|"$/g, "") 
        : String(stickyRecord.value);
      
      // Try to delete old sticky message
      const botToken = Deno.env.get("DISCORD_CUSTOMER_BOT_TOKEN");
      if (botToken && oldMessageId) {
        try {
          await fetch(
            `https://discord.com/api/v10/channels/${channelId}/messages/${oldMessageId}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bot ${botToken}` },
            }
          );
          console.log("[STICKY] Deleted old sticky message:", oldMessageId);
        } catch (e) {
          console.log("[STICKY] Could not delete old message (may already be gone):", e);
        }
      }
    }

    // Send the new sticky embed
    const result = await sendBotMessage(channelId, {
      embeds: [
        {
          title: "📢 Paid Promotions",
          description:
            "This channel is for **paid advertisements** from verified Eclipse users. " +
            "Want to advertise here? **[Get Started →](" + SITE_URL + "/advertising)**",
          color: ECLIPSE_COLOR,
          footer: {
            text: "Eclipse Marketplace",
            icon_url: ECLIPSE_ICON,
          },
        },
      ],
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send sticky message");
    }

    // Store the new message ID so we can delete it later
    await supabase
      .from("settings")
      .upsert({ key: "ads_sticky_message_id", value: JSON.stringify(result.messageId) }, { onConflict: "key" });

    // Reset the ad counter
    await supabase
      .from("settings")
      .upsert({ key: "ads_since_last_sticky", value: JSON.stringify("0") }, { onConflict: "key" });

    console.log("[STICKY] Sent new sticky message:", result.messageId);

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[STICKY] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
