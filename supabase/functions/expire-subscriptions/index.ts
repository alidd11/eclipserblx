import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders }
  const _unauth = requireServiceRole(req, corsHeaders);
  if (_unauth) return _unauth;
);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("[expire-subscriptions] Running scheduled cleanup...");

    // Expire admin-granted subscriptions (no stripe_subscription_id) past their end date
    const { data: adminExpired, error: adminError } = await supabase
      .from("subscriptions")
      .update({ status: "inactive" })
      .eq("status", "active")
      .is("stripe_subscription_id", null)
      .lt("current_period_end", new Date().toISOString())
      .select("id");

    if (adminError) {
      console.error("[expire-subscriptions] Admin grants error:", adminError.message);
    }

    const adminCount = adminExpired?.length ?? 0;
    console.log(`[expire-subscriptions] Expired ${adminCount} admin-granted subscriptions`);

    // Expire seller subscriptions past their grace period
    const { data: sellerExpired, error: sellerError } = await supabase
      .from("seller_subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("status", "past_due")
      .lt("grace_period_end", new Date().toISOString())
      .select("id, user_id");

    if (sellerError) {
      console.error("[expire-subscriptions] Seller grace period error:", sellerError.message);
    }

    const sellerCount = sellerExpired?.length ?? 0;
    console.log(`[expire-subscriptions] Expired ${sellerCount} seller subscriptions past grace period`);

    // Reset is_pro flag on stores for expired seller subscriptions
    if (sellerExpired?.length) {
      for (const sub of sellerExpired) {
        await supabase.from("stores").update({ is_pro: false }).eq("owner_id", sub.user_id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, expired_admin_grants: adminCount, expired_seller_grace: sellerCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[expire-subscriptions] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
