import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-SCHEDULED-ADS] ${step}${detailsStr}`);
};

// Tier ads limits for embed color
const TIER_COLORS: Record<string, number> = {
  'basic': 0x3498DB,
  'pro': 0x9B59B6,
  'premium': 0xFFD700,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting scheduled ads processing");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find all scheduled ads that are due
    const now = new Date().toISOString();
    const { data: scheduledAds, error: fetchError } = await supabaseAdmin
      .from("discord_advertisements")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_for", now);

    if (fetchError) {
      throw new Error(`Failed to fetch scheduled ads: ${fetchError.message}`);
    }

    if (!scheduledAds || scheduledAds.length === 0) {
      logStep("No scheduled ads to process");
      return new Response(JSON.stringify({ 
        success: true, 
        processed: 0,
        message: "No scheduled ads to process"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep(`Found ${scheduledAds.length} scheduled ads to process`);

    // Get webhook URL and partnership ping role ID
    const { data: adSettings } = await supabaseAdmin
      .from("settings")
      .select("key, value")
      .in("key", ["advertisements_discord_webhook_url", "advertisements_partnership_ping_role_id"]);

    const webhookSetting = adSettings?.find(s => s.key === "advertisements_discord_webhook_url");
    const partnershipPingSetting = adSettings?.find(s => s.key === "advertisements_partnership_ping_role_id");

    if (!webhookSetting?.value) {
      throw new Error("Advertisement webhook not configured");
    }

    const webhookUrl = typeof webhookSetting.value === 'string' 
      ? webhookSetting.value.replace(/"/g, '') 
      : String(webhookSetting.value);

    const partnershipPingRoleId = partnershipPingSetting?.value 
      ? (typeof partnershipPingSetting.value === 'string' 
          ? partnershipPingSetting.value.replace(/"/g, '') 
          : String(partnershipPingSetting.value))
      : null;

    let processedCount = 0;
    let failedCount = 0;

    for (const ad of scheduledAds) {
      try {
        // Get user's subscription tier for embed color
        const { data: subscription } = await supabaseAdmin
          .from("advertisement_subscriptions")
          .select("tier")
          .eq("user_id", ad.user_id)
          .eq("status", "active")
          .maybeSingle();

        const tier = subscription?.tier || 'basic';
        const embedColor = TIER_COLORS[tier] || TIER_COLORS.basic;

        // Build Discord embed
        const embed: Record<string, unknown> = {
          title: `📢 ${ad.title}`,
          description: ad.description,
          color: embedColor,
          timestamp: new Date().toISOString(),
          footer: {
            text: ad.discord_username 
              ? `Sponsored • @${ad.discord_username} • Eclipse Ads ${tier.charAt(0).toUpperCase() + tier.slice(1)}`
              : `Sponsored • Eclipse Ads ${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
          },
        };

        if (ad.image_url) {
          embed.image = { url: ad.image_url };
        }

        if (ad.link_url) {
          embed.fields = [{
            name: "🔗 Learn More",
            value: `[Click here](${ad.link_url})`,
            inline: false,
          }];
        }

        // Build content with ping if selected
        let messageContent = "";
        if (ad.ping_type === 'everyone') {
          messageContent = "@everyone";
        } else if (ad.ping_type === 'here') {
          messageContent = "@here";
        } else if (partnershipPingRoleId) {
          messageContent = `<@&${partnershipPingRoleId}>`;
        }

        logStep(`Posting scheduled ad ${ad.id} to Discord`, { title: ad.title, pingType: ad.ping_type });

        // Post to Discord
        const discordResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: messageContent || undefined,
            embeds: [embed],
          }),
        });

        if (!discordResponse.ok) {
          const errorText = await discordResponse.text();
          logStep(`Discord webhook failed for ad ${ad.id}`, { status: discordResponse.status, error: errorText });
          
          // Mark as failed
          await supabaseAdmin
            .from("discord_advertisements")
            .update({ 
              status: "failed",
              updated_at: new Date().toISOString()
            })
            .eq("id", ad.id);
          
          failedCount++;
          continue;
        }

        // Update advertisement status to posted
        await supabaseAdmin
          .from("discord_advertisements")
          .update({ 
            status: "posted", 
            posted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", ad.id);

        processedCount++;
        logStep(`Successfully posted scheduled ad ${ad.id}`);

        // Add a small delay between posts to avoid rate limiting
        if (scheduledAds.indexOf(ad) < scheduledAds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (adError) {
        const errorMessage = adError instanceof Error ? adError.message : String(adError);
        logStep(`Error processing ad ${ad.id}`, { error: errorMessage });
        
        // Mark as failed
        await supabaseAdmin
          .from("discord_advertisements")
          .update({ 
            status: "failed",
            updated_at: new Date().toISOString()
          })
          .eq("id", ad.id);
        
        failedCount++;
      }
    }

    logStep("Completed processing scheduled ads", { processed: processedCount, failed: failedCount });

    return new Response(JSON.stringify({ 
      success: true, 
      processed: processedCount,
      failed: failedCount,
      message: `Processed ${processedCount} ads, ${failedCount} failed`
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
