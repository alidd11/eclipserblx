import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-SCHEDULED-ADS] ${step}${detailsStr}`);
};

// Helper: shorten a URL via TinyURL free API (skip Discord links)
const shortenUrl = async (url: string): Promise<string> => {
  // Don't shorten Discord invite links
  if (/discord\.(gg|com|io)/i.test(url)) return url;
  try {
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    if (res.ok) {
      const short = (await res.text()).trim();
      if (short.startsWith('http')) return short;
    }
  } catch { /* fall through */ }
  return url;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders }
  const _unauth = requireServiceRole(req, corsHeaders);
  if (_unauth) return _unauth;
);
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
        // Extract and strip ALL [View Image](url) markdown links from description
        // Regex allows one level of parentheses inside URLs (e.g. image-(1).png)
        const markdownLinkRegex = /\[View Image\]\((https?:\/\/(?:[^\(\)]+|\([^\)]*\))+)\)/gi;
        const extractedImageUrls: string[] = ad.image_url ? [ad.image_url] : [];
        const cleanDescription = ad.description.replace(markdownLinkRegex, (_, url) => {
          extractedImageUrls.push(url.trim());
          return '';
        }).replace(/\n{3,}/g, '\n\n').trim();

        // Convert remaining markdown links to raw URLs so Discord can render them
        const anyMarkdownLink = /\[([^\]]+)\]\((https?:\/\/(?:[^\(\)]+|\([^\)]*\))+)\)/g;
        const fullyCleanDescription = cleanDescription.replace(anyMarkdownLink, (_, _text, url) => url);

        // Build ping prefix
        let pingPrefix = "";
        if (ad.ping_type === 'everyone') pingPrefix = "@everyone\n";
        else if (ad.ping_type === 'here') pingPrefix = "@here\n";
        else if (partnershipPingRoleId) {
          // Only ping partnership role if the user has balance remaining
          const { data: subForPing } = await supabaseAdmin
            .from("advertisement_subscriptions")
            .select("id, partnership_pings_balance")
            .eq("user_id", ad.user_id)
            .eq("status", "active")
            .maybeSingle();

          if (subForPing && subForPing.partnership_pings_balance > 0) {
            pingPrefix = `<@&${partnershipPingRoleId}>\n`;
            // Deduct 1 from partnership ping balance
            await supabaseAdmin
              .from("advertisement_subscriptions")
              .update({ partnership_pings_balance: subForPing.partnership_pings_balance - 1 })
              .eq("id", subForPing.id);
            logStep(`Deducted partnership ping for ad ${ad.id}`, { remaining: subForPing.partnership_pings_balance - 1 });
          } else {
            logStep(`No partnership ping balance for ad ${ad.id}, skipping ping`);
          }
        }

        // Footer line
        const footerLine = ad.discord_username
          ? `*Sponsored • @${ad.discord_username} • Eclipse Ads*`
          : `*Sponsored • Eclipse Ads*`;

        // Build plain text message (same approach as admin-resend-ad)
        let plainText = `${pingPrefix}📢 **${ad.title}**\n\n${fullyCleanDescription}`;
        if (ad.link_url) {
          const shortLink = await shortenUrl(ad.link_url);
          plainText += `\n\n🔗 ${shortLink}`;
        }
        // Post all raw image URLs so Discord auto-embeds them inline
        if (extractedImageUrls.length > 0) {
          plainText += `\n${extractedImageUrls.join('\n')}`;
        }
        plainText += `\n\n${footerLine}`;
        // Enforce Discord's 2000 char limit
        if (plainText.length > 2000) plainText = plainText.substring(0, 1997) + '...';

        logStep(`Posting scheduled ad ${ad.id} to Discord`, { title: ad.title, pingType: ad.ping_type, imageCount: extractedImageUrls.length });

        // Post to Discord as plain text (with ?wait=true to get message ID back)
        const discordResponse = await fetch(webhookUrl + "?wait=true", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: plainText }),
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

        const discordResult = await discordResponse.json();
        const newMessageId = discordResult?.id || null;

        // Update advertisement status to posted
        await supabaseAdmin
          .from("discord_advertisements")
          .update({ 
            status: "posted", 
            posted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            discord_message_id: newMessageId,
          })
          .eq("id", ad.id);

        processedCount++;
        logStep(`Successfully posted scheduled ad ${ad.id}`, { messageId: newMessageId });

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
