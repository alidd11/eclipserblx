import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[POST-SUBSCRIPTION-AD] ${step}${detailsStr}`);
};

// Tier ads limits
const TIER_ADS: Record<string, number> = {
  'basic': 3,
  'pro': 10,
  'premium': 30,
};

// Partnership pings included per tier (for sellers only)
const TIER_PARTNERSHIP_PINGS: Record<string, number> = {
  'basic': 2,
  'pro': 4,
  'premium': 10,
};

// Hardcoded seller Discord role ID for partnership pings
const SELLER_PARTNERSHIP_PING_ROLE_ID = '1461853576694468876';

// Sanitize text input
const sanitizeText = (text: string): string => {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/@(everyone|here)/gi, '@\u200B$1')
    .trim();
};

// Validate URL
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, imageUrls, linkUrl, discordUsername, pingType, scheduledFor, slotId } = await req.json();

    // Validate inputs
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new Error("Title is required");
    }
    if (title.length > 100) {
      throw new Error("Title must be 100 characters or less");
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      throw new Error("Description is required");
    }
    if (description.length > 2000) {
      throw new Error("Description must be 2000 characters or less");
    }

    // Validate imageUrls array (up to 3)
    const validImageUrls: string[] = [];
    if (imageUrls && Array.isArray(imageUrls)) {
      for (const url of imageUrls) {
        if (!url || typeof url !== 'string' || !url.trim()) continue;
        if (url.length > 500 || !isValidUrl(url)) {
          throw new Error("Invalid image URL: " + url.substring(0, 50));
        }
        validImageUrls.push(url.trim());
      }
    }
    if (validImageUrls.length > 3) {
      throw new Error("Maximum 3 image URLs allowed");
    }

    if (linkUrl && (typeof linkUrl !== 'string' || linkUrl.length > 500 || !isValidUrl(linkUrl))) {
      throw new Error("Invalid link URL");
    }

    // Validate scheduled date if provided
    let parsedScheduledFor: Date | null = null;
    if (scheduledFor) {
      parsedScheduledFor = new Date(scheduledFor);
      if (isNaN(parsedScheduledFor.getTime())) {
        throw new Error("Invalid scheduled date");
      }
      if (parsedScheduledFor <= new Date()) {
        throw new Error("Scheduled date must be in the future");
      }
    }

    const sanitizedTitle = sanitizeText(title);
    const sanitizedDescription = sanitizeText(description);
    const sanitizedDiscordUsername = discordUsername ? sanitizeText(discordUsername) : null;

    logStep("Request received", { title: sanitizedTitle, scheduled: !!scheduledFor });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Check subscription status
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: subscription, error: subError } = await supabaseAdmin
      .from("advertisement_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (subError || !subscription) {
      throw new Error("You need an active advertisement subscription to post ads");
    }

    // Check ads remaining
    const adsPerMonth = TIER_ADS[subscription.tier] || 0;
    const adsUsed = subscription.ads_used_this_month || 0;

    if (adsUsed >= adsPerMonth) {
      throw new Error(`You've used all ${adsPerMonth} ads for this month. Upgrade your plan or wait until next month.`);
    }

    logStep("Subscription valid", { tier: subscription.tier, adsUsed, adsPerMonth });

    // All tiers can schedule; validate slot if provided
    if (parsedScheduledFor && slotId) {
      // Mark the slot as booked
      const { error: slotError } = await supabaseAdmin
        .from("ad_schedule_slots")
        .update({ user_id: user.id, booked_at: new Date().toISOString() })
        .eq("id", slotId)
        .is("user_id", null); // Only book if not already taken
      if (slotError) {
        throw new Error("That slot is already taken. Please choose another.");
      }
    }

    // Check if the user is a seller (has an active store)
    const { data: sellerStore } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    const isSeller = !!sellerStore;
    logStep("Seller check", { isSeller, userId: user.id });

    // Get webhook URL from settings
    const { data: adSettings } = await supabaseAdmin
      .from("settings")
      .select("key, value")
      .eq("key", "advertisements_discord_webhook_url");

    const webhookSetting = adSettings?.find(s => s.key === "advertisements_discord_webhook_url");

    if (!webhookSetting?.value) {
      throw new Error("Advertisement webhook not configured");
    }

    const webhookUrl = typeof webhookSetting.value === 'string' 
      ? webhookSetting.value.replace(/"/g, '') 
      : String(webhookSetting.value);

    // Validate ping type if provided and check balance
    const validPingTypes = ['here', 'everyone', null];
    let selectedPingType = pingType && validPingTypes.includes(pingType) ? pingType : null;
    
    // Check if user has ping balance for selected ping
    if (selectedPingType === 'here' && (subscription.here_pings_balance || 0) < 1) {
      selectedPingType = null; // No balance, don't use ping
      logStep("No @here ping balance available");
    }
    if (selectedPingType === 'everyone' && (subscription.everyone_pings_balance || 0) < 1) {
      selectedPingType = null; // No balance, don't use ping
      logStep("No @everyone ping balance available");
    }

    // Create advertisement record
    const { data: advertisement, error: adError } = await supabaseAdmin
      .from("discord_advertisements")
      .insert({
        user_id: user.id,
        title: sanitizedTitle,
        description: sanitizedDescription,
        image_url: validImageUrls[0] || null,
        link_url: linkUrl?.trim() || null,
        discord_username: sanitizedDiscordUsername,
        status: parsedScheduledFor ? "scheduled" : "paid",
        price_paid: 0,
        ping_type: selectedPingType,
        ping_price_paid: 0,
        scheduled_for: parsedScheduledFor?.toISOString() || null,
      })
      .select()
      .single();

    if (adError) {
      throw new Error("Failed to create advertisement record");
    }

    // If scheduled, don't post to Discord now - just save and return
    if (parsedScheduledFor) {
      // Update subscription usage (scheduled ads still consume the ping balance upfront)
      const updateData: Record<string, unknown> = {
        ads_used_this_month: adsUsed + 1,
        updated_at: new Date().toISOString(),
      };
      
      if (selectedPingType === 'here') {
        updateData.here_pings_balance = Math.max(0, (subscription.here_pings_balance || 0) - 1);
      } else if (selectedPingType === 'everyone') {
        updateData.everyone_pings_balance = Math.max(0, (subscription.everyone_pings_balance || 0) - 1);
      }
      // Note: partnership pings for scheduled ads are deducted when the ad actually posts (via process-scheduled-ads)

      await supabaseAdmin
        .from("advertisement_subscriptions")
        .update(updateData)
        .eq("id", subscription.id);

      logStep("Advertisement scheduled successfully", { adId: advertisement.id, scheduledFor: parsedScheduledFor.toISOString() });

      return new Response(JSON.stringify({ 
        success: true, 
        scheduled: true,
        scheduled_for: parsedScheduledFor.toISOString(),
        ads_remaining: adsPerMonth - adsUsed - 1,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Determine partnership ping usage (seller-only, costs a partnership_pings_balance credit)
    const partnershipPingsBalance = subscription.partnership_pings_balance || 0;
    const usePartnershipPing = isSeller && partnershipPingsBalance > 0 && !selectedPingType;

    // Build ping prefix
    let pingPrefix = "";
    if (selectedPingType === 'everyone') {
      pingPrefix = "@everyone\n";
    } else if (selectedPingType === 'here') {
      pingPrefix = "@here\n";
    } else if (usePartnershipPing) {
      pingPrefix = `<@&${SELLER_PARTNERSHIP_PING_ROLE_ID}>\n`;
    }

    const tierLabel = `Eclipse Ads ${subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}`;
    const footerLine = sanitizedDiscordUsername
      ? `*Sponsored • @${sanitizedDiscordUsername} • ${tierLabel}*`
      : `*Sponsored • ${tierLabel}*`;

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

    // Build plain text message — show full ad
    let plainText = `${pingPrefix}📢 **${sanitizedTitle}**\n\n${sanitizedDescription}`;

    if (linkUrl) {
      // Only shorten the link URL (not images — raw URLs needed for Discord auto-embed)
      const shortLink = await shortenUrl(linkUrl);
      plainText += `\n\n🔗 ${shortLink}`;
    }

    if (validImageUrls.length > 0) {
      // Post raw URLs — Discord requires the actual image URL (with extension) to auto-embed
      plainText += `\n${validImageUrls.join('\n')}`;
    }

    plainText += `\n\n${footerLine}`;

    logStep("Posting to Discord", { pingType: selectedPingType, usePartnershipPing, isSeller, partnershipPingsBalance });

    // Post to Discord as plain text (no embeds)
    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: plainText,
      }),
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      logStep("Discord webhook failed", { status: discordResponse.status, error: errorText });
      throw new Error("Failed to post to Discord");
    }

    // Update advertisement status and increment usage
    await supabaseAdmin
      .from("discord_advertisements")
      .update({ 
        status: "posted", 
        posted_at: new Date().toISOString() 
      })
      .eq("id", advertisement.id);

    // Update advertisement status and increment usage, deduct ping if used
    const updateData: Record<string, unknown> = {
      ads_used_this_month: adsUsed + 1,
      updated_at: new Date().toISOString(),
    };
    
    if (selectedPingType === 'here') {
      updateData.here_pings_balance = Math.max(0, (subscription.here_pings_balance || 0) - 1);
    } else if (selectedPingType === 'everyone') {
      updateData.everyone_pings_balance = Math.max(0, (subscription.everyone_pings_balance || 0) - 1);
    }
    if (usePartnershipPing) {
      updateData.partnership_pings_balance = Math.max(0, partnershipPingsBalance - 1);
    }

    await supabaseAdmin
      .from("advertisement_subscriptions")
      .update(updateData)
      .eq("id", subscription.id);

    logStep("Advertisement posted successfully", { adId: advertisement.id });

    // Increment ad counter and check if we need to resend the sticky message
    try {
      const { data: counterRecord } = await supabaseAdmin
        .from("settings")
        .select("value")
        .eq("key", "ads_since_last_sticky")
        .maybeSingle();

      const currentCount = counterRecord?.value ? parseInt(String(counterRecord.value).replace(/"/g, ""), 10) || 0 : 0;
      const newCount = currentCount + 1;

      await supabaseAdmin
        .from("settings")
        .upsert({ key: "ads_since_last_sticky", value: JSON.stringify(String(newCount)) }, { onConflict: "key" });

      if (newCount >= 6) {
        logStep("6 ads reached, scheduling sticky resend in 1 hour");
        setTimeout(async () => {
          try {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
            await fetch(`${supabaseUrl}/functions/v1/send-discord-embed`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({ template: "ads_sticky" }),
            });
          } catch (e) {
            console.error("[POST-SUB-AD] Failed to trigger sticky resend:", e);
          }
        }, 60 * 60 * 1000);
      }
    } catch (stickyError) {
      logStep("Sticky counter error (non-fatal)", { error: String(stickyError) });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      ads_remaining: adsPerMonth - adsUsed - 1,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
