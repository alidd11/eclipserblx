import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";
 import { sendBotMessage, buildSettingsMap } from "../_shared/discord-bot.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-ADVERTISEMENT-DISCORD-WEBHOOK] ${step}${detailsStr}`);
};

// Validate UUID format
const isValidUuid = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// Sanitize text to prevent Discord embed issues
const sanitizeForDiscord = (text: string): string => {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/@(everyone|here)/gi, '@\u200B$1')
    .substring(0, 2000); // Discord embed limit
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting - use EXPENSIVE since this sends to external service
    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit({
      ...RATE_LIMITS.EXPENSIVE,
      identifier: clientIp,
      action: 'send_advertisement_webhook',
    });

    if (!rateLimitResult.allowed) {
      logStep("Rate limited", { ip: clientIp });
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    const { advertisementId } = await req.json();

    if (!advertisementId || typeof advertisementId !== 'string') {
      throw new Error("Advertisement ID is required");
    }

    // Validate UUID format
    if (!isValidUuid(advertisementId)) {
      throw new Error("Invalid advertisement ID format");
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

    // Get channel ID and webhook URL from settings
    const { data: settings } = await supabaseClient
      .from("settings")
      .select("key, value")
      .in("key", ["advertisements_discord_channel_id", "advertisements_discord_webhook_url"]);

    const settingsMap = buildSettingsMap(settings);
    const channelId = settingsMap["advertisements_discord_channel_id"];
    const webhookUrl = settingsMap["advertisements_discord_webhook_url"];

    if (!channelId && !webhookUrl) {
      logStep("No channel ID or webhook URL configured");
      throw new Error("Advertisement webhook not configured");
    }

    if (!channelId && webhookUrl && !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      throw new Error("Invalid webhook URL");
    }

    logStep("Discord settings retrieved", { hasChannelId: !!channelId, hasWebhookUrl: !!webhookUrl });

    // Build Discord embed with sanitized content
    const sanitizedTitle = sanitizeForDiscord(advertisement.title);
    const sanitizedDescription = sanitizeForDiscord(advertisement.description);
    const sanitizedUsername = advertisement.discord_username 
      ? sanitizeForDiscord(advertisement.discord_username) 
      : null;

    const embed: Record<string, unknown> = {
      title: `📢 ${sanitizedTitle}`,
      description: sanitizedDescription,
      color: 0x9b59b6, // Purple color
      timestamp: new Date().toISOString(),
      footer: {
        text: sanitizedUsername 
          ? `Sponsored • Posted by @${sanitizedUsername}`
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

    // Use bot API if channel ID is configured, otherwise fall back to webhook
    let discordMessageId: string | null = null;

    if (channelId) {
      const result = await sendBotMessage(channelId, webhookPayload);

      if (!result.success) {
        logStep("Discord bot message failed", { error: result.error });
        
        await supabaseClient
          .from("discord_advertisements")
          .update({ status: "failed" })
          .eq("id", advertisementId);

        throw new Error(`Discord bot message failed: ${result.error}`);
      }

      discordMessageId = result.messageId || null;
      logStep("Advertisement sent via bot", { messageId: discordMessageId });
    } else {
      // Legacy webhook method
      const discordResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      });

      if (!discordResponse.ok) {
        const errorText = await discordResponse.text();
        logStep("Discord webhook failed", { status: discordResponse.status, error: errorText });
        
        await supabaseClient
          .from("discord_advertisements")
          .update({ status: "failed" })
          .eq("id", advertisementId);

        throw new Error(`Discord webhook failed: ${discordResponse.status}`);
      }

      try {
        const discordResult = await discordResponse.json();
        discordMessageId = discordResult.id || null;
      } catch {
        // Some webhook configurations don't return JSON
      }

      logStep("Advertisement sent via webhook", { messageId: discordMessageId });
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

    // Increment ad counter and check if we need to resend the sticky message
    try {
      const { data: counterRecord } = await supabaseClient
        .from("settings")
        .select("value")
        .eq("key", "ads_since_last_sticky")
        .maybeSingle();

      const currentCount = counterRecord?.value ? parseInt(String(counterRecord.value).replace(/"/g, ""), 10) || 0 : 0;
      const newCount = currentCount + 1;

      await supabaseClient
        .from("settings")
        .upsert({ key: "ads_since_last_sticky", value: JSON.stringify(String(newCount)) }, { onConflict: "key" });

      if (newCount >= 6) {
        logStep("6 ads reached, scheduling sticky resend in 1 hour");
        // Fire and forget — resend sticky after 1 hour delay
        setTimeout(async () => {
          try {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
            await fetch(`${supabaseUrl}/functions/v1/send-ads-channel-sticky`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({}),
            });
          } catch (e) {
            console.error("[SEND-ADVERTISEMENT] Failed to trigger sticky resend:", e);
          }
        }, 60 * 60 * 1000); // 1 hour
      }
    } catch (stickyError) {
      // Non-fatal — don't fail the ad post because of sticky logic
      logStep("Sticky counter error (non-fatal)", { error: String(stickyError) });
    }

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
