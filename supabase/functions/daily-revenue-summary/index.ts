import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOG = (step: string, d?: unknown) => {
  const s = d ? ` - ${JSON.stringify(d)}` : "";
  console.log(`[DAILY-REVENUE] ${step}${s}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get webhook URL
    const { data: setting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "finance_webhook_sales")
      .single();

    if (!setting?.value) {
      return new Response(JSON.stringify({ error: "No sales webhook configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let webhookUrl = setting.value;
    try { webhookUrl = JSON.parse(webhookUrl); } catch { /* already plain string */ }
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);

    LOG("Fetching daily stats", { from: todayStart.toISOString() });

    // Today's orders
    const { data: todayOrders, count: todayCount } = await supabase
      .from("orders")
      .select("total", { count: "exact" })
      .gte("created_at", todayStart.toISOString())
      .in("status", ["paid", "completed"]);

    const todayRevenue = (todayOrders || []).reduce((sum, o) => sum + (o.total || 0), 0);

    // Yesterday's orders (for comparison)
    const { data: yesterdayOrders, count: yesterdayCount } = await supabase
      .from("orders")
      .select("total", { count: "exact" })
      .gte("created_at", yesterdayStart.toISOString())
      .lt("created_at", todayStart.toISOString())
      .in("status", ["paid", "completed"]);

    const yesterdayRevenue = (yesterdayOrders || []).reduce((sum, o) => sum + (o.total || 0), 0);

    // This month's orders
    const monthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);
    const { data: monthOrders } = await supabase
      .from("orders")
      .select("total")
      .gte("created_at", monthStart.toISOString())
      .in("status", ["paid", "completed"]);

    const monthRevenue = (monthOrders || []).reduce((sum, o) => sum + (o.total || 0), 0);

    // Today's refunds
    const { data: todayRefunds } = await supabase
      .from("refund_requests")
      .select("amount")
      .gte("created_at", todayStart.toISOString())
      .eq("status", "approved");

    const todayRefundTotal = (todayRefunds || []).reduce((sum, r) => sum + (r.amount || 0), 0);

    // Pending payouts
    const { data: pendingPayouts } = await supabase
      .from("seller_payouts")
      .select("amount")
      .eq("status", "pending");

    const pendingPayoutTotal = (pendingPayouts || []).reduce((sum, p) => sum + (p.amount || 0), 0);

    // Top selling products today
    const { data: topProducts } = await supabase
      .from("order_items")
      .select("product_name, quantity")
      .gte("created_at", todayStart.toISOString());

    const productCounts: Record<string, number> = {};
    for (const item of topProducts || []) {
      const name = item.product_name || "Unknown";
      productCounts[name] = (productCounts[name] || 0) + (item.quantity || 1);
    }

    const topList = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count], i) => `${i + 1}. ${name} (${count} sold)`)
      .join("\n") || "No sales yet today";

    // Revenue comparison
    const changePercent = yesterdayRevenue > 0
      ? (((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100).toFixed(1)
      : "N/A";
    const changeEmoji = todayRevenue >= yesterdayRevenue ? "\uD83D\uDCC8" : "\uD83D\uDCC9";

    const embed = {
      author: { name: "Eclipse Finances" },
      title: `\uD83D\uDCCA Daily Revenue Summary \u2014 ${now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
      color: 0x5865F2,
      fields: [
        {
          name: "\uD83D\uDCB0 Today's Revenue",
          value: `\u00A3${todayRevenue.toFixed(2)} (${todayCount || 0} orders)`,
          inline: true,
        },
        {
          name: `${changeEmoji} vs Yesterday`,
          value: changePercent === "N/A"
            ? "No sales yesterday"
            : `${Number(changePercent) >= 0 ? "+" : ""}${changePercent}% (\u00A3${yesterdayRevenue.toFixed(2)})`,
          inline: true,
        },
        {
          name: "\uD83D\uDCC5 Month Total",
          value: `\u00A3${monthRevenue.toFixed(2)}`,
          inline: true,
        },
        {
          name: "\uD83D\uDD04 Refunds Today",
          value: `\u00A3${todayRefundTotal.toFixed(2)} (${(todayRefunds || []).length} refunds)`,
          inline: true,
        },
        {
          name: "\uD83D\uDCE4 Net Revenue",
          value: `\u00A3${(todayRevenue - todayRefundTotal).toFixed(2)}`,
          inline: true,
        },
        {
          name: "\u23F3 Pending Payouts",
          value: `\u00A3${pendingPayoutTotal.toFixed(2)} (${(pendingPayouts || []).length} pending)`,
          inline: true,
        },
        {
          name: "\uD83C\uDFC6 Top Products Today",
          value: topList,
          inline: false,
        },
      ],
      footer: { text: "Eclipse Marketplace \u2022 Daily Report" },
      timestamp: now.toISOString(),
    };

    // Send to Discord
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Webhook failed [${res.status}]: ${text}`);
    }

    LOG("Daily summary sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    LOG("Error", { error: String(error) });
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
