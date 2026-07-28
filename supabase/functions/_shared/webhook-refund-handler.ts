import Stripe from "https://esm.sh/stripe@18.5.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { logStep } from "./stripe-helpers.ts";

const LOG = (step: string, d?: unknown) => logStep("STRIPE-WEBHOOK", step, d);

export interface RefundData {
  chargeId: string;
  paymentIntentId: string | null;
  refundAmount: number;
  isFullRefund: boolean;
}

export async function processRefund(
  supabase: SupabaseClient,
  data: RefundData,
  stripe?: Stripe
) {
  const { chargeId, paymentIntentId, refundAmount, isFullRefund } = data;
  LOG("Processing refund", { chargeId, paymentIntentId, refundAmount, isFullRefund });

  // Find order
  let order: { id: string; user_id: string | null; customer_email: string; status: string } | null = null;

  if (paymentIntentId) {
    const { data: o } = await supabase.from("orders").select("id, user_id, customer_email, status").eq("payment_id", paymentIntentId).maybeSingle();
    if (o) order = o as any;
  }

  if (!order && paymentIntentId && stripe) {
    try {
      const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
      if (sessions.data.length > 0) {
        const { data: o } = await supabase.from("orders").select("id, user_id, customer_email, status").eq("payment_id", sessions.data[0].id).maybeSingle();
        if (o) order = o as any;
      }
    } catch { /* continue */ }
  }

  // REMOVED: Fuzzy amount-based matching was a security risk — could refund wrong order.
  // If we can't find the order by payment ID, log and bail.
  if (!order) {
    LOG("WARNING: Could not find order for refund by payment ID", { chargeId, paymentIntentId });
    return;
  }


  const orderId = order.id;

  // Stripe's charge.refunded amount is cumulative. Apply only the positive
  // delta under a row lock so repeated and out-of-order webhook deliveries are
  // idempotent while later partial refunds can still be accounted for.
  const { data: refundResult, error: refundError } = await supabase.rpc(
    'apply_cumulative_order_refund',
    {
      p_order_id: orderId,
      p_charge_id: chargeId,
      p_cumulative_amount: refundAmount / 100,
      p_is_full_refund: isFullRefund,
    },
  );
  if (refundError) {
    throw new Error(`Failed to apply refund accounting: ${refundError.message}`);
  }

  const applied = Boolean((refundResult as any)?.applied);
  if (!applied) {
    LOG("Refund already accounted for", { orderId, refundAmount });
    return;
  }

  const appliedAmount = Number((refundResult as any)?.delta || 0);
  const effectiveFullRefund = Boolean((refundResult as any)?.is_full_refund);

  // Notify sellers
  try {
    const { data: orderItems } = await supabase.from("order_items").select("product_id, product_name, price").eq("order_id", orderId);
    if (orderItems) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      for (const item of orderItems) {
        if (!item.product_id) continue;
        const { data: product } = await supabase.from("products").select("store_id").eq("id", item.product_id).maybeSingle();
        if (product?.store_id) {
          await fetch(`${supabaseUrl}/functions/v1/notify-seller-sale`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({ type: 'dispute', store_id: product.store_id, order_id: orderId, product_name: item.product_name, reason: effectiveFullRefund ? 'Full refund issued' : 'Partial refund issued', amount: appliedAmount }),
          });
        }
      }
    }
  } catch { /* non-fatal */ }

  // User notification
  if (order.user_id) {
    const msg = effectiveFullRefund
      ? "Your order has been fully refunded. The refund will appear in your account within 5-10 business days."
      : `A partial refund of £${appliedAmount.toFixed(2)} has been processed for your order.`;
    await supabase.from('notifications').insert({
      user_id: order.user_id,
      title: effectiveFullRefund ? '💸 Order Refunded' : '💸 Partial Refund Processed',
      message: msg, type: 'refund', link: '/account#purchases',
    });
  }

  // Finance server notification with real store data
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    let storeName: string | null = null;
    const { data: firstItem } = await supabase.from("order_items").select("product_id").eq("order_id", orderId).limit(1).maybeSingle();
    if (firstItem?.product_id) {
      const { data: prod } = await supabase.from("products").select("stores(name)").eq("id", firstItem.product_id).maybeSingle();
      const s = (prod as any)?.stores;
      storeName = Array.isArray(s) ? s[0]?.name : s?.name;
    }
    await fetch(`${supabaseUrl}/functions/v1/finance-notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({ type: "refund_processed", data: { orderId, userId: order.user_id, amount: appliedAmount, storeName: storeName || "Unknown", reason: effectiveFullRefund ? "Full refund" : "Partial refund" } }),
    });
  } catch { /* non-fatal */ }

  LOG("Refund processing complete", { orderId, isFullRefund: effectiveFullRefund, appliedAmount });
}
