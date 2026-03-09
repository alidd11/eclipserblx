import Stripe from "https://esm.sh/stripe@18.5.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { logStep } from "./stripe-helpers.ts";

const LOG = (step: string, d?: unknown) => logStep("STRIPE-WEBHOOK", step, d);

// Tier mappings (keep in sync with check-ad-subscription)
const PRICE_TO_TIER: Record<string, string> = {
  'price_1SttzSCjEHxHwNl9UHABm76P': 'basic',
  'price_1Stu02CjEHxHwNl9zVFtnEK8': 'basic',
  'price_1Stu17CjEHxHwNl9CG4LHcNQ': 'pro',
  'price_1Stu1dCjEHxHwNl9FsDlCc4g': 'pro',
  'price_1Stu2FCjEHxHwNl9JtlqWHFx': 'premium',
  'price_1Stu2SCjEHxHwNl9tNsxoyHk': 'premium',
};

const TIER_PARTNERSHIP_PINGS: Record<string, number> = {
  'basic': 2, 'pro': 4, 'premium': 10,
};

export async function processAdSubscriptionPurchase(
  supabase: SupabaseClient, stripe: Stripe, session: Stripe.Checkout.Session
) {
  const metadata = session.metadata;
  if (!metadata) return;

  const userId = metadata.user_id;
  const tier = metadata.tier;
  if (!userId || !tier) return;

  LOG("Processing ad subscription", { userId, tier });

  try {
    let stripeSubId: string | null = null;
    let periodStart: string | null = null;
    let periodEnd: string | null = null;
    let customerId: string | null = null;
    let billingPeriod = metadata.billing_period || 'monthly';

    if (session.subscription) {
      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      stripeSubId = sub.id;
      customerId = sub.customer as string;
      periodStart = new Date(sub.current_period_start * 1000).toISOString();
      periodEnd = new Date(sub.current_period_end * 1000).toISOString();
      billingPeriod = sub.items.data[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly';
    }

    const { data: existing } = await supabase
      .from("advertisement_subscriptions").select("id, partnership_pings_balance")
      .eq("user_id", userId).maybeSingle();

    const now = new Date().toISOString();
    const pings = existing?.partnership_pings_balance ?? TIER_PARTNERSHIP_PINGS[tier] ?? 0;

    const payload = {
      tier, status: 'active', stripe_subscription_id: stripeSubId, stripe_customer_id: customerId,
      current_period_start: periodStart, current_period_end: periodEnd, billing_period: billingPeriod,
      payment_method: 'stripe', ads_used_this_month: 0, ads_reset_at: now, partnership_pings_balance: pings,
      updated_at: now,
    };

    if (existing) {
      await supabase.from("advertisement_subscriptions").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("advertisement_subscriptions").insert({
        ...payload, user_id: userId, here_pings_balance: 0, everyone_pings_balance: 0,
      });
    }

    await supabase.from("notifications").insert({
      user_id: userId,
      title: `📢 ${tier.charAt(0).toUpperCase() + tier.slice(1)} Ad Plan Activated!`,
      message: `Your ${tier} advertising plan is now active. Start creating your first ad!`,
      type: 'success',
    });
  } catch (err) {
    LOG("ERROR in processAdSubscriptionPurchase", { error: String(err) });
  }
}

export async function processAdPingPurchase(supabase: SupabaseClient, session: Stripe.Checkout.Session) {
  const metadata = session.metadata;
  if (!metadata) return;

  const userId = metadata.user_id;
  const herePings = parseInt(metadata.here_pings || "0", 10);
  const everyonePings = parseInt(metadata.everyone_pings || "0", 10);
  if (!userId) return;

  LOG("Processing ad ping purchase", { userId, herePings, everyonePings });

  // Use idempotent RPC with session.id as reference to prevent double-fulfillment
  const { data: updated } = await supabase.rpc('increment_ad_ping_balance', {
    p_user_id: userId,
    p_here_pings: herePings,
    p_everyone_pings: everyonePings,
    p_reference_id: session.id,
  });

  if (updated) {
    LOG("Ad pings added", { herePings, everyonePings });
  } else {
    LOG("Ad ping purchase already fulfilled or no active subscription", { sessionId: session.id });
  }
}

export async function processCreditPurchase(supabase: SupabaseClient, session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const userId = metadata.user_id;
  const creditAmount = parseFloat(metadata.credit_amount || "0");
  if (!userId || creditAmount <= 0) return;

  LOG("Processing credit purchase", { userId, creditAmount });

  await supabase.rpc('add_credits', {
    p_user_id: userId, p_amount: creditAmount, p_type: 'purchase',
    p_description: `Credit purchase - £${creditAmount.toFixed(2)}`,
    p_reference_id: session.id, p_gifted_by: null, p_order_id: null,
  });

  await supabase.from("notifications").insert({
    user_id: userId, title: "💰 Credits Added!",
    message: `£${creditAmount.toFixed(2)} has been added to your credit balance.`, type: "general",
  });
}
