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
      
      logStep("Processing subscription event", { 
        type: event.type, 
        subscriptionId: subscription.id,
        customerId,
        status: subscription.status 
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
        logStep("No customer email found, skipping Discord webhook");
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
      
      // Determine what Discord event to send based on subscription status
      let discordEvent: 'subscription_activated' | 'subscription_deactivated' | null = null;
      let isActive = false;
      
      if (event.type === "customer.subscription.created" && subscription.status === "active") {
        discordEvent = "subscription_activated";
        isActive = true;
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
      // Eclipse+ members get 10% commission, non-members get 15%
      if (discordEvent) {
        const newCommissionRate = isActive ? 10 : 15;
        
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
