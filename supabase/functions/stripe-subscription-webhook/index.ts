import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-SUBSCRIPTION-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Rate limiting
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit({
    maxRequests: 60,
    windowMs: 60000,
    identifier: clientIp,
    action: 'stripe-subscription-webhook',
  });

  if (!rateLimitResult.allowed) {
    logStep("Rate limit exceeded", { ip: clientIp });
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    logStep("Subscription webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logStep("ERROR: No signature header");
      return new Response("No signature", { status: 400 });
    }

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Signature verified", { eventType: event.type, eventId: event.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logStep("ERROR: Signature verification failed", { message });
      return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
    }

    // Handle subscription events
    if (event.type.startsWith("customer.subscription.")) {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      // Check if this is a Global Guard subscription
      const isGlobalGuard = subscription.metadata?.product_type === 'global_guard';
      
      logStep("Processing subscription event", { 
        type: event.type, 
        subscriptionId: subscription.id,
        customerId,
        status: subscription.status,
        isGlobalGuard,
      });

      // Get customer email to find user
      let customerEmail: string | null = null;
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted) {
          customerEmail = customer.email;
        }
      } catch (e) {
        logStep("Failed to get customer", { error: String(e) });
      }

      if (!customerEmail) {
        logStep("No customer email found, skipping");
        return new Response(JSON.stringify({ received: true }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Find user by email
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("user_id, discord_id")
        .eq("email", customerEmail)
        .maybeSingle();

      if (!profile?.user_id) {
        logStep("No user found for email", { email: customerEmail });
        return new Response(JSON.stringify({ received: true }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }

      const userId = profile.user_id;
      
      // Handle Global Guard subscriptions separately
      if (isGlobalGuard) {
        await handleGlobalGuardSubscription(supabaseAdmin, subscription, userId, event.type);
        return new Response(JSON.stringify({ received: true }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      // Determine what Discord event to send based on subscription status
      let discordEvent: 'subscription_activated' | 'subscription_deactivated' | null = null;
      let isActive = false;
      
      if (event.type === "customer.subscription.created" && subscription.status === "active") {
        discordEvent = "subscription_activated";
        isActive = true;
        
        // Grant Eclipse+ credit bonus on first subscription
        await grantEclipsePlusCreditBonus(supabaseAdmin, userId);
      } else if (event.type === "customer.subscription.updated") {
        if (subscription.status === "active") {
          discordEvent = "subscription_activated";
          isActive = true;
        } else if (["canceled", "unpaid", "past_due", "incomplete_expired"].includes(subscription.status)) {
          discordEvent = "subscription_deactivated";
          isActive = false;
        }
      } else if (event.type === "customer.subscription.deleted") {
        discordEvent = "subscription_deactivated";
        isActive = false;
      }

      // Sync seller commission rate if user has a store
      // Rates are configurable via admin settings
      if (discordEvent) {
        // Fetch configurable rates from settings table
        const { data: rateSettings } = await supabaseAdmin
          .from("settings")
          .select("key, value")
          .in("key", ["marketplace_default_commission_rate", "marketplace_eclipse_commission_rate"]);
        
        const settingsMap = (rateSettings || []).reduce((acc: Record<string, number>, s: any) => {
          const val = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : s.value;
          acc[s.key] = parseFloat(String(val)) || 0;
          return acc;
        }, {} as Record<string, number>);
        
        const eclipseRate = settingsMap.marketplace_eclipse_commission_rate ?? 10;
        const defaultRate = settingsMap.marketplace_default_commission_rate ?? 15;
        const newCommissionRate = isActive ? eclipseRate : defaultRate;
        
        const { data: store, error: storeError } = await supabaseAdmin
          .from("stores")
          .select("id, commission_rate, custom_commission_rate, custom_rate_expires_at")
          .eq("owner_id", userId)
          .maybeSingle();
        
        if (store && !storeError) {
          // Only update if there's no active custom rate override
          const hasActiveCustomRate = store.custom_commission_rate !== null && 
            (!store.custom_rate_expires_at || new Date(store.custom_rate_expires_at) > new Date());
          
          if (!hasActiveCustomRate && store.commission_rate !== newCommissionRate) {
            const { error: updateError } = await supabaseAdmin
              .from("stores")
              .update({ commission_rate: newCommissionRate })
              .eq("id", store.id);
            
            if (updateError) {
              logStep("Failed to update seller commission rate", { error: updateError.message });
            } else {
              logStep("Updated seller commission rate", { 
                userId, 
                storeId: store.id, 
                oldRate: store.commission_rate, 
                newRate: newCommissionRate,
                reason: isActive ? "Eclipse+ activated" : "Eclipse+ deactivated"
              });
            }
          } else {
            logStep("Skipping commission update", { 
              reason: hasActiveCustomRate ? "custom rate active" : "rate already correct",
              currentRate: store.commission_rate,
              newRate: newCommissionRate
            });
          }
        } else if (storeError) {
          logStep("Error checking for store", { error: storeError.message });
        }
      }

      if (discordEvent && profile.discord_id) {
        logStep("Sending Discord webhook", { userId, discordEvent, discordId: profile.discord_id });
        
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
          const response = await fetch(`${supabaseUrl}/functions/v1/send-discord-webhook`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              user_id: userId,
              event: discordEvent,
              subscription_end: subscription.current_period_end 
                ? new Date(subscription.current_period_end * 1000).toISOString() 
                : undefined,
              granted_by_admin: false,
            }),
          });
          
          logStep("Discord webhook response", { status: response.status });
        } catch (webhookError) {
          logStep("Failed to send Discord webhook", { error: String(webhookError) });
        }
      } else {
        logStep("Skipping Discord webhook", { 
          reason: !discordEvent ? "no matching event" : "no discord_id",
          discordEvent,
          hasDiscordId: !!profile.discord_id 
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Handle Global Guard subscription events
async function handleGlobalGuardSubscription(
  supabase: any,
  subscription: Stripe.Subscription,
  userId: string,
  eventType: string
) {
  const additionalServers = parseInt(subscription.metadata?.additional_servers || '0');
  
  logStep("Handling Global Guard subscription", { 
    userId, 
    subscriptionId: subscription.id,
    status: subscription.status,
    additionalServers,
  });
  
  if (eventType === "customer.subscription.created" || 
      (eventType === "customer.subscription.updated" && subscription.status === "active")) {
    
    // Create or update usage record
    const { error } = await supabase
      .from('global_guard_server_usage')
      .upsert({
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        base_servers: 2,
        additional_servers: additionalServers,
        current_server_count: 0,
        billing_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        billing_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        status: 'active',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });
    
    if (error) {
      logStep("Failed to update Global Guard usage", { error: error.message });
    } else {
      logStep("Global Guard subscription activated", { userId, additionalServers });
      
      // Create notification
      await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title: "🛡️ Global Guard Activated!",
          message: `Your Global Guard subscription is now active with ${2 + additionalServers} server slots.`,
          type: "general",
        });
    }
    
  } else if (eventType === "customer.subscription.deleted" || 
             ["canceled", "unpaid", "past_due"].includes(subscription.status)) {
    
    // Mark subscription as inactive
    const { error } = await supabase
      .from('global_guard_server_usage')
      .update({
        status: subscription.status === "canceled" ? 'canceled' : 
                subscription.status === "past_due" ? 'past_due' : 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    
    if (error) {
      logStep("Failed to deactivate Global Guard", { error: error.message });
    } else {
      logStep("Global Guard subscription deactivated", { userId, status: subscription.status });
      
      // Create notification
      await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title: "⚠️ Global Guard Subscription Ended",
          message: "Your Global Guard subscription has ended. Resubscribe to continue syncing bans.",
          type: "general",
        });
    }
  }
}

// Grant Eclipse+ £10 credit bonus on first subscription
async function grantEclipsePlusCreditBonus(
  supabase: any,
  userId: string
) {
  try {
    const { data: success, error } = await supabase.rpc('claim_eclipse_plus_credit_bonus', {
      p_user_id: userId
    });
    
    if (error) {
      console.log(`[STRIPE-SUBSCRIPTION-WEBHOOK] Error granting credit bonus: ${error.message}`);
      return;
    }
    
    if (success) {
      console.log(`[STRIPE-SUBSCRIPTION-WEBHOOK] Granted £10 Eclipse+ credit bonus to user: ${userId}`);
      
      // Create notification
      await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title: "🎁 Welcome to Eclipse+!",
          message: "You've received £10 in store credit as a welcome bonus. Enjoy shopping!",
          type: "general",
        });
    } else {
      console.log(`[STRIPE-SUBSCRIPTION-WEBHOOK] User ${userId} already claimed Eclipse+ bonus`);
    }
  } catch (e) {
    console.log(`[STRIPE-SUBSCRIPTION-WEBHOOK] Failed to grant credit bonus: ${String(e)}`);
  }
}
