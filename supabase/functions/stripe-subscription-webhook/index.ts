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


async function handleSellerProSubscription(
  supabase: any, subscription: any, userId: string, customerId: string, eventType: string
) {
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  const isPastDue = subscription.status === 'past_due';
  const periodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString() : null;
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString() : null;
  const storeId = subscription.metadata?.store_id || null;

  // Calculate grace period end (7 days from now) for past_due status
  const gracePeriodEnd = isPastDue
    ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const subData: Record<string, unknown> = {
    user_id: userId,
    store_id: storeId || null,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    status: isActive ? 'active' : (subscription.status === 'canceled' ? 'cancelled' : subscription.status),
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancelled_at: !isActive && !isPastDue ? new Date().toISOString() : null,
    grace_period_end: isActive ? null : gracePeriodEnd,
    updated_at: new Date().toISOString(),
  };

  // Upsert seller_subscriptions
  const { data: existing } = await supabase
    .from('seller_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('seller_subscriptions').update(subData).eq('id', existing.id);
  } else {
    await supabase.from('seller_subscriptions').insert({ ...subData, created_at: new Date().toISOString() });
  }

  // Update stores.is_pro flag
  let targetStoreId = storeId;
  if (!targetStoreId) {
    const { data: store } = await supabase.from('stores').select('id').eq('owner_id', userId).maybeSingle();
    if (store) targetStoreId = store.id;
  }
  if (targetStoreId) {
    await supabase.from('stores').update({ is_pro: isActive }).eq('id', targetStoreId);
  }

  // Update commission rate (Pro = 10%, Free = 15%) unless admin custom rate is active
  const { data: store } = await supabase
    .from('stores')
    .select('id, commission_rate, custom_commission_rate, custom_rate_expires_at')
    .eq('owner_id', userId)
    .maybeSingle();

  if (store) {
    const hasActiveCustomRate = store.custom_commission_rate !== null &&
      (!store.custom_rate_expires_at || new Date(store.custom_rate_expires_at) > new Date());
    if (!hasActiveCustomRate) {
      await supabase.from('stores').update({ commission_rate: isActive ? 10 : 15 }).eq('id', store.id);
    }
  }

  // Grant ad credit on first activation
  if (isActive && eventType.includes('created')) {
    try {
      await supabase.rpc('add_credits', {
        p_user_id: userId,
        p_amount: 5,
        p_type: 'subscription_bonus',
        p_description: 'Eclipse Pro monthly ad credit',
      });
      logStep("Granted Eclipse Pro ad credit", { userId });
    } catch (e) {
      logStep("Failed to grant Eclipse Pro ad credit", { error: String(e) });
    }
  }

  logStep("Seller Pro subscription handled", { userId, status: isActive ? 'active' : 'inactive' });
}

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
      return new Response(`Webhook signature verification failed`, { status: 400 });
    }

    // IP Shield price IDs
    const IP_SHIELD_PRICE_IDS = [
      "price_1T4QCOCjEHxHwNl9Hr9uHeWe", // starter
      "price_1T4OTVCjEHxHwNl9fNIFX8kG", // pro
      "price_1T4OmYCjEHxHwNl9vLYAuHni", // enterprise
    ];
    const IP_SHIELD_TIER_MAP: Record<string, string> = {
      "price_1T4QCOCjEHxHwNl9Hr9uHeWe": "Starter",
      "price_1T4OTVCjEHxHwNl9fNIFX8kG": "Pro",
      "price_1T4OmYCjEHxHwNl9vLYAuHni": "Enterprise",
    };

    // Handle subscription events
    if (event.type.startsWith("customer.subscription.")) {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      // Check if this is a Global Guard subscription
      const isGlobalGuard = subscription.metadata?.product_type === 'global_guard';
      
      // Check if this is a custom domain subscription
      const isCustomDomain = subscription.metadata?.type === 'custom_domain';
      const CUSTOM_DOMAIN_PRICE_ID = "price_1T8wQ9CjEHxHwNl9JtcT4Okv";
      const isCustomDomainByPrice = subscription.items.data.some(item => item.price.id === CUSTOM_DOMAIN_PRICE_ID);
      
      // Check if this is an IP Shield subscription
      const ipShieldItem = subscription.items.data.find(item => 
        IP_SHIELD_PRICE_IDS.includes(item.price.id)
      );
      const isIpShield = !!ipShieldItem;
      
      logStep("Processing subscription event", { 
        type: event.type, 
        subscriptionId: subscription.id,
        customerId,
        status: subscription.status,
        isGlobalGuard,
        isIpShield,
        isCustomDomain: isCustomDomain || isCustomDomainByPrice,
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
      
      // Handle Custom Domain subscriptions
      if (isCustomDomain || isCustomDomainByPrice) {
        const storeId = subscription.metadata?.store_id;
        if (storeId) {
          const isActive = subscription.status === "active" || subscription.status === "trialing";
          const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
          
          // Upsert billing record
          const { data: existingBilling } = await supabaseAdmin
            .from("store_domain_billing")
            .select("id")
            .eq("stripe_subscription_id", subscription.id)
            .maybeSingle();
          
          if (existingBilling) {
            await supabaseAdmin.from("store_domain_billing").update({
              status: isActive ? "active" : "cancelled",
              current_period_end: periodEnd,
              stripe_customer_id: customerId,
              cancelled_at: !isActive ? new Date().toISOString() : null,
            }).eq("id", existingBilling.id);
          } else if (isActive) {
            await supabaseAdmin.from("store_domain_billing").insert({
              store_id: storeId,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: customerId,
              status: "active",
              current_period_end: periodEnd,
            });
          }
          
          logStep("Custom domain subscription handled", { storeId, status: isActive ? "active" : "cancelled" });
        }
        return new Response(JSON.stringify({ received: true }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Handle IP Shield subscriptions
      if (isIpShield) {
        await handleIpShieldSubscription(supabaseAdmin, subscription, userId, customerEmail, event.type, ipShieldItem!, IP_SHIELD_TIER_MAP);
        return new Response(JSON.stringify({ received: true }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Check if this is a Seller Pro subscription
      const isSellerPro = subscription.metadata?.type === 'seller_pro';
      if (isSellerPro) {
        await handleSellerProSubscription(supabaseAdmin, subscription, userId, customerId, event.type);
        return new Response(JSON.stringify({ received: true }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      logStep("Unhandled subscription product, ignoring", { subscriptionId: subscription.id });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
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


// Handle IP Shield subscription events — send email + in-app notifications
async function handleIpShieldSubscription(
  supabase: any,
  subscription: Stripe.Subscription,
  userId: string,
  customerEmail: string,
  eventType: string,
  ipShieldItem: Stripe.SubscriptionItem,
  tierMap: Record<string, string>,
) {
  const tierName = tierMap[ipShieldItem.price.id] || "Unknown";
  const isActivation = (
    eventType === "customer.subscription.created" ||
    (eventType === "customer.subscription.updated" && subscription.status === "active")
  );

  logStep("Handling IP Shield subscription", {
    userId,
    tier: tierName,
    status: subscription.status,
    eventType,
    isActivation,
  });

  // Get user display info
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, email")
    .eq("user_id", userId)
    .maybeSingle();

  const displayName = (profile?.display_name || profile?.username || customerEmail).replace(/[<>"'&]/g, '');

  // 1. Send email notification to legal team
  if (isActivation) {
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "Eclipse IP Shield <noreply@eclipserblx.com>",
            to: ["legal@eclipserblx.com"],
            subject: `🛡️ New IP Shield Subscription — ${tierName} — ${displayName}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a1a2e;">🛡️ New IP Shield Subscriber</h2>
                <div style="background: #f4f4f8; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <p style="margin: 4px 0;"><strong>User:</strong> ${displayName}</p>
                  <p style="margin: 4px 0;"><strong>Email:</strong> ${customerEmail}</p>
                  <p style="margin: 4px 0;"><strong>Tier:</strong> ${tierName}</p>
                  <p style="margin: 4px 0;"><strong>Subscription ID:</strong> ${subscription.id}</p>
                  <p style="margin: 4px 0;"><strong>Period End:</strong> ${subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toLocaleDateString("en-GB") : "N/A"}</p>
                </div>
                <p style="color: #666; font-size: 13px;">This user now has access to the IP Shield dashboard. Ensure onboarding steps are tracked.</p>
              </div>
            `,
          }),
        });
        logStep("IP Shield email notification sent", { status: emailRes.status });
      } else {
        logStep("RESEND_API_KEY not set, skipping email notification");
      }
    } catch (emailErr) {
      logStep("Failed to send IP Shield email notification", { error: String(emailErr) });
    }
  }

  // 2. Create in-app notification for the subscriber
  const notifTitle = isActivation
    ? `🛡️ IP Shield ${tierName} Activated!`
    : `⚠️ IP Shield Subscription ${subscription.status === "canceled" ? "Cancelled" : "Updated"}`;
  const notifMessage = isActivation
    ? `Your IP Shield ${tierName} plan is now active. Head to the IP Shield dashboard to register your assets.`
    : `Your IP Shield subscription status has changed to: ${subscription.status}.`;

  await supabase.from("notifications").insert({
    user_id: userId,
    title: notifTitle,
    message: notifMessage,
    type: "general",
  });

  // 3. Notify all staff with ip_shield_staff permission via in-app notifications
  if (isActivation) {
    try {
      const { data: staffUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "owner"]);

      const { data: ipStaffUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "ip_shield_staff");

      // Merge unique staff user IDs
      const allStaff = new Set<string>();
      (staffUsers || []).forEach((r: any) => allStaff.add(r.user_id));
      (ipStaffUsers || []).forEach((r: any) => allStaff.add(r.user_id));

      if (allStaff.size > 0) {
        const staffIds = Array.from(allStaff);
        const staffNotifications = staffIds.map((staffId) => ({
          user_id: staffId,
          title: `🛡️ New IP Shield Subscriber`,
          message: `${displayName} (${customerEmail}) subscribed to IP Shield ${tierName}.`,
          type: "general",
        }));

        const { error: notifErr } = await supabase
          .from("notifications")
          .insert(staffNotifications);

        if (notifErr) {
          logStep("Failed to notify staff", { error: notifErr.message });
        } else {
          logStep("Staff notified", { count: allStaff.size });
        }

        // 4. Send push notifications to all admin/staff
        try {
          const { data: pushSubs } = await supabase
            .from("push_subscriptions")
            .select("user_id, subscription")
            .in("user_id", staffIds);

          if (pushSubs && pushSubs.length > 0) {
            for (const sub of pushSubs) {
              try {
                const subscription = typeof sub.subscription === "string" ? JSON.parse(sub.subscription) : sub.subscription;
                const payload = JSON.stringify({
                  title: "🛡️ New IP Shield Subscriber",
                  body: `${displayName} subscribed to IP Shield ${tierName}`,
                  tag: `ip-shield-sub-${subscription.id || Date.now()}`,
                  data: { url: "/ip-staff" },
                });

                await fetch(subscription.endpoint, {
                  method: "POST",
                  body: payload,
                  headers: {
                    "Content-Type": "application/json",
                  },
                });
              } catch (pushErr) {
                logStep("Push notification failed for user", { userId: sub.user_id, error: String(pushErr) });
              }
            }
            logStep("Push notifications sent to staff", { count: pushSubs.length });
          }
        } catch (pushErr) {
          logStep("Failed to send push notifications", { error: String(pushErr) });
        }

        // 5. Send individual email alerts to admin users
        try {
          const { data: adminUsers } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");

          if (adminUsers && adminUsers.length > 0) {
            const adminIds = adminUsers.map((a: any) => a.user_id);
            const { data: adminProfiles } = await supabase
              .from("profiles")
              .select("user_id, email")
              .in("user_id", adminIds);

            const resendKey = Deno.env.get("RESEND_API_KEY");
            if (resendKey && adminProfiles && adminProfiles.length > 0) {
              const adminEmails = adminProfiles.map((p: any) => p.email).filter(Boolean);
              if (adminEmails.length > 0) {
                await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${resendKey}`,
                  },
                  body: JSON.stringify({
                    from: "Eclipse IP Shield <noreply@eclipserblx.com>",
                    to: adminEmails,
                    subject: `🛡️ New IP Shield Subscription — ${tierName} — ${displayName}`,
                    html: `
                      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a1a2e;">🛡️ New IP Shield Subscriber</h2>
                        <p>A new user has subscribed to IP Shield.</p>
                        <div style="background: #f4f4f8; padding: 16px; border-radius: 8px; margin: 16px 0;">
                          <p style="margin: 4px 0;"><strong>User:</strong> ${displayName}</p>
                          <p style="margin: 4px 0;"><strong>Email:</strong> ${customerEmail}</p>
                          <p style="margin: 4px 0;"><strong>Tier:</strong> ${tierName}</p>
                          <p style="margin: 4px 0;"><strong>Subscription ID:</strong> ${subscription.id}</p>
                          <p style="margin: 4px 0;"><strong>Period End:</strong> ${subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toLocaleDateString("en-GB") : "N/A"}</p>
                        </div>
                        <p style="color: #666; font-size: 13px;">You are receiving this because you are an admin on the Eclipse platform.</p>
                      </div>
                    `,
                  }),
                });
                logStep("Admin email notifications sent", { count: adminEmails.length });
              }
            }
          }
        } catch (adminEmailErr) {
          logStep("Failed to send admin email notifications", { error: String(adminEmailErr) });
        }
      }
    } catch (staffErr) {
      logStep("Failed to query staff users", { error: String(staffErr) });
    }
  }
}
