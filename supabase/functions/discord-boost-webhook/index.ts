import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

function logStep(step: string, details?: Record<string, unknown>) {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[discord-boost-webhook] ${step}${detailsStr}`);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate webhook secret
    const webhookSecret = Deno.env.get("DISCORD_WEBHOOK_SECRET");
    const providedSecret = req.headers.get("x-webhook-secret");

    if (!webhookSecret) {
      logStep("ERROR: DISCORD_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (providedSecret !== webhookSecret) {
      logStep("ERROR: Invalid webhook secret");
      return new Response(
        JSON.stringify({ error: "Invalid webhook secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { discord_id, event, boost_count = 1 } = await req.json();

    logStep("Received boost event", { discord_id, event, boost_count });

    if (!discord_id || !event) {
      return new Response(
        JSON.stringify({ error: "discord_id and event are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!['boost_started', 'boost_ended', 'boost_updated'].includes(event)) {
      return new Response(
        JSON.stringify({ error: "Invalid event type. Must be boost_started, boost_ended, or boost_updated" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if boost rewards are enabled
    const { data: boostSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'boost_rewards_enabled')
      .maybeSingle();

    const boostRewardsEnabled = boostSetting?.value === true || boostSetting?.value === 'true';
    
    if (!boostRewardsEnabled) {
      logStep("Boost rewards are disabled");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Boost rewards are currently disabled",
          skipped: true 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get trial duration setting
    const { data: trialDaysSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'boost_trial_days')
      .maybeSingle();

    const trialDays = parseInt(String(trialDaysSetting?.value || '7'), 10) || 7;

    // Find user by discord_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, email, display_name, discord_username')
      .eq('discord_id', discord_id)
      .maybeSingle();

    if (profileError) {
      logStep("Error fetching profile", { error: profileError.message });
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile) {
      logStep("No user found with this Discord ID", { discord_id });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No user account linked to this Discord ID. User must link their Discord account first.",
          code: "USER_NOT_LINKED"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = profile.user_id;

    // Handle boost ended event
    if (event === 'boost_ended') {
      logStep("Processing boost ended", { userId, discord_id });

      // Check if user has existing boost trial
      const { data: existingTrial } = await supabase
        .from('discord_boost_trials')
        .select('*')
        .eq('discord_id', discord_id)
        .maybeSingle();

      if (!existingTrial || existingTrial.revoked_at) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "No active boost trial to revoke",
            skipped: true 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update boost trial to revoked
      await supabase
        .from('discord_boost_trials')
        .update({ revoked_at: new Date().toISOString() })
        .eq('discord_id', discord_id);

      // Deactivate subscription
      await supabase
        .from('subscriptions')
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('grant_reason', 'Discord Server Boost Reward');

      // Remove Discord role
      const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
      const guildId = Deno.env.get("DISCORD_GUILD_ID");
      const roleId = Deno.env.get("DISCORD_ROLE_ID");

      if (botToken && guildId && roleId) {
        const discordApiUrl = `https://discord.com/api/v10/guilds/${guildId}/members/${discord_id}/roles/${roleId}`;
        await fetch(discordApiUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
        });
        logStep("Discord role removed", { discord_id });
      }

      // Send notification
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Boost Trial Ended',
        message: 'Your Eclipse+ boost trial has ended because you stopped boosting the server. Thank you for supporting us!',
        type: 'subscription',
        link: '/eclipse-plus',
      });

      // Log to audit
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'boost_trial_revoked',
        resource: 'discord_boost_trials',
        details: { discord_id, reason: 'boost_ended' },
      });

      logStep("Boost trial revoked successfully", { userId, discord_id });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Boost trial revoked successfully",
          action: "revoked"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle boost_started or boost_updated
    logStep("Processing boost started/updated", { userId, discord_id, boost_count });

    // Check for existing paid subscription (don't override)
    const { data: paidSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .not('stripe_subscription_id', 'is', null)
      .maybeSingle();

    if (paidSubscription) {
      logStep("User already has paid subscription", { userId });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "User already has an active paid Eclipse+ subscription. Boost reward not applied.",
          code: "ALREADY_SUBSCRIBED"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing boost trial
    const { data: existingTrial } = await supabase
      .from('discord_boost_trials')
      .select('*')
      .eq('discord_id', discord_id)
      .maybeSingle();

    // Validate boost count and trial limits
    const clampedBoostCount = Math.min(Math.max(boost_count, 1), 2);
    const maxTrialDays = trialDays * 2; // 7 days per boost, max 14 days

    if (existingTrial) {
      // Check if trial was previously used to max capacity
      if (existingTrial.boost_count >= 2 && existingTrial.revoked_at) {
        logStep("User has already used maximum boost trials", { userId, discord_id });
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "You have already used the maximum boost trial reward (2 boosts = 2 weeks). This cannot be used again.",
            code: "MAX_TRIALS_USED"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Calculate trial dates
    const now = new Date();
    let trialStart: Date;
    let trialEnd: Date;

    if (existingTrial && !existingTrial.revoked_at) {
      // Extending existing active trial
      trialStart = new Date(existingTrial.trial_start);
      const additionalDays = (clampedBoostCount - existingTrial.boost_count) * trialDays;
      trialEnd = new Date(existingTrial.trial_end);
      trialEnd.setDate(trialEnd.getDate() + additionalDays);
    } else {
      // New trial
      trialStart = now;
      trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + (clampedBoostCount * trialDays));
    }

    // Upsert boost trial record
    const { error: trialError } = await supabase
      .from('discord_boost_trials')
      .upsert({
        user_id: userId,
        discord_id,
        boost_count: clampedBoostCount,
        trial_start: trialStart.toISOString(),
        trial_end: trialEnd.toISOString(),
        last_boost_at: now.toISOString(),
        revoked_at: null, // Clear revoked status if re-boosting
      }, {
        onConflict: 'discord_id',
      });

    if (trialError) {
      logStep("Error upserting boost trial", { error: trialError.message });
      return new Response(
        JSON.stringify({ error: "Failed to create boost trial record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert subscription
    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        status: 'active',
        grant_reason: 'Discord Server Boost Reward',
        granted_at: now.toISOString(),
        current_period_start: trialStart.toISOString(),
        current_period_end: trialEnd.toISOString(),
        updated_at: now.toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (subError) {
      logStep("Error upserting subscription", { error: subError.message });
      return new Response(
        JSON.stringify({ error: "Failed to create subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign Discord role
    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const guildId = Deno.env.get("DISCORD_GUILD_ID");
    const roleId = Deno.env.get("DISCORD_ROLE_ID");

    if (botToken && guildId && roleId) {
      const discordApiUrl = `https://discord.com/api/v10/guilds/${guildId}/members/${discord_id}/roles/${roleId}`;
      const roleResponse = await fetch(discordApiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (roleResponse.status === 204) {
        logStep("Discord role assigned", { discord_id });
      } else {
        logStep("Failed to assign Discord role", { status: roleResponse.status });
      }
    }

    // Send in-app notification
    const daysGranted = clampedBoostCount * trialDays;
    const isExtension = existingTrial && !existingTrial.revoked_at;
    
    await supabase.from('notifications').insert({
      user_id: userId,
      title: isExtension ? 'Boost Trial Extended!' : 'Boost Reward Unlocked! 🎉',
      message: isExtension 
        ? `Your Eclipse+ trial has been extended to ${daysGranted} days for using ${clampedBoostCount} boost(s)! Thank you for your support!`
        : `Thank you for boosting our server! You've received ${daysGranted} days of Eclipse+ free. Enjoy member-only benefits!`,
      type: 'subscription',
      link: '/eclipse-plus',
    });

    // Send push notification
    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          userId,
          title: isExtension ? 'Boost Trial Extended! 🚀' : 'Boost Reward Unlocked! 🎉',
          body: `You now have ${daysGranted} days of Eclipse+ free!`,
          url: '/eclipse-plus',
        },
      });
    } catch (pushError) {
      logStep("Push notification failed (non-critical)", { error: String(pushError) });
    }

    // Log to audit
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: isExtension ? 'boost_trial_extended' : 'boost_trial_granted',
      resource: 'discord_boost_trials',
      details: { 
        discord_id, 
        boost_count: clampedBoostCount,
        trial_days: daysGranted,
        trial_end: trialEnd.toISOString()
      },
    });

    logStep("Boost trial granted successfully", { 
      userId, 
      discord_id, 
      boost_count: clampedBoostCount,
      trial_end: trialEnd.toISOString(),
      action: isExtension ? 'extended' : 'granted'
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: isExtension 
          ? `Eclipse+ trial extended to ${daysGranted} days`
          : `Eclipse+ trial granted for ${daysGranted} days`,
        action: isExtension ? 'extended' : 'granted',
        trial_end: trialEnd.toISOString(),
        boost_count: clampedBoostCount
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Unexpected error", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});