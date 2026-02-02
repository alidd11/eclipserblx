import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ORDER-DISCORD-NOTIFICATION] ${step}${detailsStr}`);
};

interface OrderNotificationPayload {
  orderId: string;
  userId: string | null;
  customerEmail: string;
  productNames: string[];
  total: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: OrderNotificationPayload = await req.json();
    const { orderId, userId, customerEmail, productNames, total } = payload;

    logStep("Received order notification request", { orderId, userId, productCount: productNames.length });

    // Get the order webhook URL from settings
    const { data: webhookSetting, error: settingsError } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "discord_webhook_url")
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching webhook setting:", settingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch webhook setting" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the webhook URL (it may be JSON-encoded)
    let webhookUrl = webhookSetting?.value;
    if (typeof webhookUrl === "string") {
      try {
        webhookUrl = JSON.parse(webhookUrl);
      } catch {
        // It's already a plain string
      }
    }

    if (!webhookUrl) {
      logStep("No order webhook URL configured, skipping notification");
      return new Response(
        JSON.stringify({ skipped: true, message: "No webhook URL configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize profile data
    let discordId: string | null = null;
    let discordUsername: string | null = null;
    let robloxUserId: string | null = null;
    let robloxUsername: string | null = null;

    // Fetch user profile if userId is provided
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("discord_id, discord_username, roblox_user_id, roblox_username")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile) {
        discordId = profile.discord_id;
        discordUsername = profile.discord_username;
        robloxUserId = profile.roblox_user_id;
        robloxUsername = profile.roblox_username;
      }
    }

    logStep("Profile data fetched", { discordId, discordUsername, robloxUserId, robloxUsername });

    // Build the product names string (each on new line if multiple)
    const productList = productNames.length > 0 
      ? productNames.join("\n") 
      : "Unknown Product";

    // Build description in Parcel format
    let description = `**Product Name**\n${productList}`;

    // Add Roblox if linked
    if (robloxUserId && robloxUsername) {
      description += `\n**Roblox**\n${robloxUsername}\n(${robloxUserId})`;
    }

    // Add Discord if linked
    if (discordId && discordUsername) {
      description += `\n**Discord**\n${discordUsername}\n(${discordId})`;
    } else if (discordId) {
      description += `\n**Discord**\n<@${discordId}>\n(${discordId})`;
    }

    // Get Roblox avatar thumbnail if user has Roblox linked
    let thumbnailUrl: string | undefined;
    if (robloxUserId) {
      try {
        const avatarResponse = await fetch(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxUserId}&size=150x150&format=Png&isCircular=false`
        );
        if (avatarResponse.ok) {
          const avatarData = await avatarResponse.json();
          if (avatarData.data && avatarData.data.length > 0 && avatarData.data[0].imageUrl) {
            thumbnailUrl = avatarData.data[0].imageUrl;
            logStep("Fetched Roblox avatar", { thumbnailUrl });
          }
        }
      } catch (avatarError) {
        logStep("Failed to fetch Roblox avatar (non-fatal)", { error: String(avatarError) });
      }
    }

    // Build ClearlyDev-style Discord embed
    const embed: Record<string, unknown> = {
      author: {
        name: "Eclipse Marketplace",
      },
      title: "🛒 New Purchase",
      color: 0x5865F2, // Discord blurple
      fields: [
        {
          name: "📦 Products",
          value: productList,
          inline: false,
        },
      ],
      footer: {
        text: "View on eclipserblx.com",
      },
      timestamp: new Date().toISOString(),
    };

    // Add Roblox field if linked
    if (robloxUserId && robloxUsername) {
      (embed.fields as Array<{name: string; value: string; inline: boolean}>).push({
        name: "🎮 Roblox",
        value: `${robloxUsername}\n(${robloxUserId})`,
        inline: true,
      });
    }

    // Add Discord field if linked
    if (discordId && discordUsername) {
      (embed.fields as Array<{name: string; value: string; inline: boolean}>).push({
        name: "💬 Discord",
        value: `${discordUsername}\n(${discordId})`,
        inline: true,
      });
    } else if (discordId) {
      (embed.fields as Array<{name: string; value: string; inline: boolean}>).push({
        name: "💬 Discord",
        value: `<@${discordId}>\n(${discordId})`,
        inline: true,
      });
    }

    // Add thumbnail if we have a Roblox avatar
    if (thumbnailUrl) {
      embed.thumbnail = { url: thumbnailUrl };
    }

    // Send to Discord with ?wait=true to get message ID back
    const webhookUrlWithWait = webhookUrl.includes('?') 
      ? `${webhookUrl}&wait=true` 
      : `${webhookUrl}?wait=true`;

    const discordResponse = await fetch(webhookUrlWithWait, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error("Discord webhook failed:", discordResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Discord webhook failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to add heart reaction to the message
    try {
      const messageData = await discordResponse.json();
      const messageId = messageData.id;
      const channelId = messageData.channel_id;
      
      if (messageId && channelId) {
        const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
        if (botToken) {
          // Add heart reaction (❤️ = %E2%9D%A4%EF%B8%8F URL encoded)
          const reactionUrl = `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/%E2%9D%A4%EF%B8%8F/@me`;
          const reactionResponse = await fetch(reactionUrl, {
            method: "PUT",
            headers: {
              "Authorization": `Bot ${botToken}`,
              "Content-Type": "application/json",
            },
          });
          
          if (reactionResponse.ok || reactionResponse.status === 204) {
            logStep("Heart reaction added successfully", { messageId });
          } else {
            logStep("Failed to add heart reaction (non-fatal)", { 
              status: reactionResponse.status,
              messageId 
            });
          }
        } else {
          logStep("No DISCORD_BOT_TOKEN configured, skipping reaction");
        }
      }
    } catch (reactionError) {
      logStep("Failed to add reaction (non-fatal)", { error: String(reactionError) });
    }

    logStep("Order notification sent successfully", { orderId });

    return new Response(
      JSON.stringify({ success: true, message: "Order notification sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-order-discord-notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
