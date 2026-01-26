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
    const { title, description, imageUrl, linkUrl, discordUsername, pingType } = await req.json();

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
    if (description.length > 500) {
      throw new Error("Description must be 500 characters or less");
    }
    
    if (imageUrl && (typeof imageUrl !== 'string' || imageUrl.length > 500 || !isValidUrl(imageUrl))) {
      throw new Error("Invalid image URL");
    }
    if (linkUrl && (typeof linkUrl !== 'string' || linkUrl.length > 500 || !isValidUrl(linkUrl))) {
      throw new Error("Invalid link URL");
    }

    const sanitizedTitle = sanitizeText(title);
    const sanitizedDescription = sanitizeText(description);
    const sanitizedDiscordUsername = discordUsername ? sanitizeText(discordUsername) : null;

    logStep("Request received", { title: sanitizedTitle });

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
        image_url: imageUrl?.trim() || null,
        link_url: linkUrl?.trim() || null,
        discord_username: sanitizedDiscordUsername,
        status: "paid",
        price_paid: 0,
        ping_type: selectedPingType,
        ping_price_paid: 0,
      })
      .select()
      .single();

    if (adError) {
      throw new Error("Failed to create advertisement record");
    }

    // Build Discord embed
    const embed: Record<string, unknown> = {
      title: `📢 ${sanitizedTitle}`,
      description: sanitizedDescription,
      color: subscription.tier === 'premium' ? 0xFFD700 : subscription.tier === 'pro' ? 0x9B59B6 : 0x3498DB,
      timestamp: new Date().toISOString(),
      footer: {
        text: sanitizedDiscordUsername 
          ? `Sponsored • @${sanitizedDiscordUsername} • Eclipse Ads ${subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}`
          : `Sponsored • Eclipse Ads ${subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}`,
      },
    };

    if (imageUrl) {
      embed.image = { url: imageUrl };
    }

    if (linkUrl) {
      embed.fields = [{
        name: "🔗 Learn More",
        value: `[Click here](${linkUrl})`,
        inline: false,
      }];
    }

    // Build content with ping if selected
    let messageContent = "";
    if (selectedPingType === 'everyone') {
      messageContent = "@everyone";
    } else if (selectedPingType === 'here') {
      messageContent = "@here";
    } else if (partnershipPingRoleId) {
      // Default partnership ping for non-ping ads
      messageContent = `<@&${partnershipPingRoleId}>`;
    }

    logStep("Posting to Discord", { pingType: selectedPingType, hasPartnershipPing: !!partnershipPingRoleId });

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

    await supabaseAdmin
      .from("advertisement_subscriptions")
      .update(updateData)
      .eq("id", subscription.id);

    logStep("Advertisement posted successfully", { adId: advertisement.id });

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
