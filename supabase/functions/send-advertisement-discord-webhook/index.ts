import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-ADVERTISEMENT-DISCORD-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { advertisementId } = await req.json();

    if (!advertisementId) {
      throw new Error("Advertisement ID is required");
    }

    logStep("Request received", { advertisementId });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch advertisement details
    const { data: advertisement, error: adError } = await supabaseClient
      .from("discord_advertisements")
      .select("*")
      .eq("id", advertisementId)
      .single();

    if (adError || !advertisement) {
      logStep("Advertisement not found", adError);
      throw new Error("Advertisement not found");
    }

    if (advertisement.status === "posted") {
      logStep("Advertisement already posted");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Already posted",
        messageId: advertisement.discord_message_id 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Advertisement found", { title: advertisement.title, status: advertisement.status });

    // Get webhook URL from settings
    const { data: webhookSetting } = await supabaseClient
      .from("settings")
      .select("value")
      .eq("key", "advertisements_discord_webhook_url")
      .maybeSingle();

    if (!webhookSetting?.value) {
      logStep("No webhook URL configured");
      throw new Error("Advertisement webhook not configured");
    }

    const webhookUrl = typeof webhookSetting.value === 'string'
      ? webhookSetting.value.replace(/^"|"$/g, '')
      : String(webhookSetting.value);

    if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      throw new Error("Invalid webhook URL");
    }

    logStep("Webhook URL retrieved");

    // Build Discord embed
    const embed: Record<string, unknown> = {
      title: `📢 ${advertisement.title}`,
      description: advertisement.description,
      color: 0x9b59b6, // Purple color
      timestamp: new Date().toISOString(),
      footer: {
        text: advertisement.discord_username 
          ? `Sponsored • Posted by @${advertisement.discord_username}`
          : "Sponsored • Eclipse Marketplace",
      },
    };

    // Add image if provided
    if (advertisement.image_url) {
      embed.image = { url: advertisement.image_url };
    }

    // Add link field if provided
    if (advertisement.link_url) {
      embed.fields = [
        {
          name: "🔗 Learn More",
          value: `[Click Here](${advertisement.link_url})`,
          inline: false,
        },
      ];
    }

    const webhookPayload = {
      embeds: [embed],
    };

    logStep("Sending to Discord", { title: advertisement.title });

    // Send to Discord
    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      logStep("Discord webhook failed", { status: discordResponse.status, error: errorText });
      
      // Update status to failed
      await supabaseClient
        .from("discord_advertisements")
        .update({ status: "failed" })
        .eq("id", advertisementId);

      throw new Error(`Discord webhook failed: ${discordResponse.status}`);
    }

    // Try to get message ID from response
    let discordMessageId: string | null = null;
    try {
      const discordResult = await discordResponse.json();
      discordMessageId = discordResult.id || null;
    } catch {
      // Some webhook configurations don't return JSON
    }

    // Update advertisement status
    await supabaseClient
      .from("discord_advertisements")
      .update({ 
        status: "posted",
        posted_at: new Date().toISOString(),
        discord_message_id: discordMessageId,
      })
      .eq("id", advertisementId);

    logStep("Advertisement posted successfully", { messageId: discordMessageId });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Advertisement posted to Discord",
      messageId: discordMessageId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
