import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOG = (step: string, d?: unknown) => {
  const s = d ? ` - ${JSON.stringify(d)}` : "";
  console.log(`[STORE-HEALTH] ${step}${s}`);
};

serve(async (req) => {
  const _unauth = requireServiceRole(req, corsHeaders);
  if (_unauth) return _unauth;

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all active stores
    const { data: stores, error: storesErr } = await supabase
      .from("stores")
      .select("id, owner_id, name, is_active")
      .eq("is_active", true);

    if (storesErr) throw storesErr;
    LOG("Processing stores", { count: stores?.length });

    let processed = 0;
    let violationsCreated = 0;
    let autoSuspended = 0;

    for (const store of stores || []) {
      try {
        // 1. Dispute rate (last 30 days)
        const { count: totalOrders } = await supabase
          .from("order_items")
          .select("id", { count: "exact", head: true })
          .eq("store_id", store.id);

        const { count: disputeCount } = await supabase
          .from("refund_requests")
          .select("id", { count: "exact", head: true })
          .eq("store_id", store.id)
          .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString());

        const disputeRate = totalOrders && totalOrders > 0
          ? Math.round((disputeCount || 0) / totalOrders * 100 * 10) / 10
          : 0;

        // 2. Listing quality — products with desc >50 chars and 2+ images
        const { data: products } = await supabase
          .from("products")
          .select("id, name, description, images")
          .eq("store_id", store.id)
          .eq("is_active", true);

        const totalProducts = products?.length || 0;
        const qualityProducts = (products || []).filter(p => {
          const descLen = (p.description || "").length;
          const imgCount = Array.isArray(p.images) ? p.images.length : 0;
          return descLen >= 50 && imgCount >= 2;
        }).length;

        const listingQuality = totalProducts > 0
          ? Math.round(qualityProducts / totalProducts * 100)
          : 100;

        // 3. Low quality products — create violations
        const lowQualityProducts = (products || []).filter(p => {
          const descLen = (p.description || "").length;
          const imgCount = Array.isArray(p.images) ? p.images.length : 0;
          return descLen < 30 || imgCount === 0;
        });

        for (const lqp of lowQualityProducts) {
          // Check if violation already exists
          const { data: existing } = await supabase
            .from("compliance_violations")
            .select("id")
            .eq("store_id", store.id)
            .eq("violation_type", "low_quality_listing")
            .eq("related_product_id", lqp.id)
            .eq("is_resolved", false)
            .maybeSingle();

          if (!existing) {
            await supabase.from("compliance_violations").insert({
              store_id: store.id,
              violation_type: "low_quality_listing",
              severity: "warning",
              description: `Product "${lqp.name}" has insufficient description or missing images`,
              related_product_id: lqp.id,
            });
            violationsCreated++;
          }
        }

        // Auto-resolve quality violations for fixed products
        const { data: qualityViolations } = await supabase
          .from("compliance_violations")
          .select("id, related_product_id")
          .eq("store_id", store.id)
          .eq("violation_type", "low_quality_listing")
          .eq("is_resolved", false);

        for (const v of qualityViolations || []) {
          if (v.related_product_id) {
            const fixed = (products || []).find(p => p.id === v.related_product_id);
            if (fixed) {
              const descOk = (fixed.description || "").length >= 30;
              const imgOk = Array.isArray(fixed.images) && fixed.images.length > 0;
              if (descOk && imgOk) {
                await supabase.from("compliance_violations")
                  .update({ is_resolved: true, resolved_at: new Date().toISOString(), resolution_notes: "Auto-resolved: listing quality improved" })
                  .eq("id", v.id);
              }
            }
          }
        }

        // 4. High dispute rate violation
        if (disputeRate > 15 && (totalOrders || 0) >= 5) {
          const { data: existing } = await supabase
            .from("compliance_violations")
            .select("id")
            .eq("store_id", store.id)
            .eq("violation_type", "high_dispute_rate")
            .eq("is_resolved", false)
            .maybeSingle();

          if (!existing) {
            await supabase.from("compliance_violations").insert({
              store_id: store.id,
              violation_type: "high_dispute_rate",
              severity: "strike",
              description: `Dispute rate of ${disputeRate}% exceeds the 15% threshold over the last 30 days`,
            });
            violationsCreated++;
          }
        } else {
          // Auto-resolve if rate drops
          await supabase.from("compliance_violations")
            .update({ is_resolved: true, resolved_at: new Date().toISOString(), resolution_notes: "Auto-resolved: dispute rate normalized" })
            .eq("store_id", store.id)
            .eq("violation_type", "high_dispute_rate")
            .eq("is_resolved", false);
        }

        // 5. Count active violations
        const { count: activeViolations } = await supabase
          .from("compliance_violations")
          .select("id", { count: "exact", head: true })
          .eq("store_id", store.id)
          .eq("is_resolved", false);

        // Count active strikes
        const { count: activeStrikes } = await supabase
          .from("compliance_violations")
          .select("id", { count: "exact", head: true })
          .eq("store_id", store.id)
          .eq("is_resolved", false)
          .eq("severity", "strike");

        // 6. Calculate overall score
        const disputeScore = Math.max(0, 100 - disputeRate * 5);
        const qualityScore = listingQuality;
        const violationPenalty = (activeViolations || 0) * 10;
        const overallScore = Math.max(0, Math.min(100,
          Math.round(disputeScore * 0.3 + qualityScore * 0.3 + 100 * 0.2 + 100 * 0.2 - violationPenalty)
        ));

        const status = overallScore >= 60 ? "healthy" : overallScore >= 40 ? "at_risk" : "critical";

        // Upsert health score
        await supabase.from("store_health_scores").upsert({
          store_id: store.id,
          overall_score: overallScore,
          dispute_rate: disputeRate,
          listing_quality_score: listingQuality,
          delivery_rate: 100,
          active_violations: activeViolations || 0,
          status,
          last_calculated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "store_id" });

        // 7. Auto-suspend if 3+ strikes
        if ((activeStrikes || 0) >= 3) {
          await supabase.from("stores")
            .update({ is_active: false })
            .eq("id", store.id);

          await supabase.from("compliance_violations").insert({
            store_id: store.id,
            violation_type: "auto_suspension",
            severity: "suspension",
            description: `Store auto-suspended due to ${activeStrikes} active strikes`,
          });
          autoSuspended++;
          violationsCreated++;

          // Notify seller
          await supabase.from("seller_notifications").insert({
            user_id: store.owner_id,
            type: "compliance",
            title: "Store Suspended",
            message: "Your store has been suspended due to multiple policy violations. Please review your Account Health page.",
            action_url: "/seller/account-health",
          });
        } else if (status === "at_risk" || status === "critical") {
          // Notify seller of declining health
          await supabase.from("seller_notifications").insert({
            user_id: store.owner_id,
            type: "compliance",
            title: "Account Health Warning",
            message: `Your store health score is ${overallScore}/100 (${status.replace("_", " ")}). Review your Account Health page.`,
            action_url: "/seller/account-health",
          });
        }

        processed++;
      } catch (e) {
        LOG("Error processing store", { storeId: store.id, error: String(e) });
      }
    }

    LOG("Completed", { processed, violationsCreated, autoSuspended });

    return new Response(JSON.stringify({ processed, violationsCreated, autoSuspended }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    LOG("ERROR", { message: String(error) });
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
