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

    // Build the product names string
    const productList = productNames.length > 0 
      ? productNames.join(", ") 
      : "Unknown Product";

    // Build Discord embed fields
    const fields = [
      {
        name: "Product Name",
        value: productList,
        inline: false,
      },
    ];

    // Add Roblox field if linked
    if (robloxUserId && robloxUsername) {
      fields.push({
        name: "Roblox",
        value: `${robloxUsername} (${robloxUserId})`,
        inline: true,
      });
    } else {
      fields.push({
        name: "Roblox",
        value: "Not linked",
        inline: true,
      });
    }

    // Add Discord field if linked
    if (discordId && discordUsername) {
      fields.push({
        name: "Discord",
        value: `${discordUsername} (${discordId})`,
        inline: true,
      });
    } else if (discordId) {
      fields.push({
        name: "Discord",
        value: `<@${discordId}> (${discordId})`,
        inline: true,
      });
    } else {
      fields.push({
        name: "Discord",
        value: "Not linked",
        inline: true,
      });
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

    // Build Discord embed (Parcel-style)
    const embed: Record<string, unknown> = {
      title: "New Purchase",
      color: 0x9b59b6, // Purple color
      fields,
      timestamp: new Date().toISOString(),
      footer: {
        text: `Order ID: ${orderId.slice(0, 8)}`,
      },
    };

    // Add thumbnail if we have a Roblox avatar
    if (thumbnailUrl) {
      embed.thumbnail = { url: thumbnailUrl };
    }

    // Send to Discord
    const discordResponse = await fetch(webhookUrl, {
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
