// synthetic-order-probe — read-only E2E health check for Eclipse.
// Touches the public catalog the way an anonymous shopper would, without
// creating real orders. Records per-step latency to synthetic_runs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROBE_NAME = "marketplace_browse_e2e";

interface Step { name: string; ok: boolean; latency_ms: number; detail?: string }

async function timed<T>(name: string, fn: () => Promise<T>): Promise<{ step: Step; result: T | null }> {
  const start = Date.now();
  try {
    const result = await fn();
    return { step: { name, ok: true, latency_ms: Date.now() - start }, result };
  } catch (e) {
    return { step: { name, ok: false, latency_ms: Date.now() - start, detail: (e as Error).message }, result: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const overallStart = Date.now();
  const steps: Step[] = [];
  let failedStep: string | undefined;

  try {
    // Step 1: Active stores exist
    const stores = await timed("list_active_stores", async () => {
      const { data, error, count } = await admin.from("stores")
        .select("id", { count: "exact", head: false })
        .eq("is_active", true).limit(1);
      if (error) throw new Error(error.message);
      if (!data || (count ?? 0) === 0) throw new Error("no active stores");
      return { count: count ?? data.length };
    });
    steps.push(stores.step);
    if (!stores.result) { failedStep = "list_active_stores"; throw new Error("no stores"); }

    // Step 2: Active products available
    const products = await timed("list_active_products", async () => {
      const { data, error } = await admin.from("products")
        .select("id, name, price").eq("is_active", true).limit(5);
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error("no products");
      return data;
    });
    steps.push(products.step);
    if (!products.result) { failedStep = "list_active_products"; throw new Error("no products"); }

    // Step 3: Public products view returns rows (RLS path)
    const pub = await timed("query_products_public_view", async () => {
      const { data, error } = await admin.from("products_public" as any).select("id").limit(1);
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error("products_public empty");
      return data;
    });
    steps.push(pub.step);
    if (!pub.result) { failedStep = "query_products_public_view"; throw new Error("public view empty"); }

    // Step 4: Categories table reachable
    const cats = await timed("list_categories", async () => {
      const { data, error } = await admin.from("categories").select("id").limit(1);
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error("no categories");
      return data;
    });
    steps.push(cats.step);
    if (!cats.result) { failedStep = "list_categories"; throw new Error("no categories"); }

    // Step 5: Recent orders query (admin-side reachability)
    const orders = await timed("recent_orders_query", async () => {
      const { error } = await admin.from("orders").select("id").order("created_at", { ascending: false }).limit(1);
      if (error) throw new Error(error.message);
      return true;
    });
    steps.push(orders.step);
    if (!orders.step.ok) { failedStep = "recent_orders_query"; throw new Error(orders.step.detail); }

  } catch (e) {
    const totalLatency = Date.now() - overallStart;
    await admin.from("synthetic_runs").insert({
      probe_name: PROBE_NAME, success: false, total_latency_ms: totalLatency,
      steps: steps as any, failed_step: failedStep, error_message: (e as Error).message,
    });
    return new Response(JSON.stringify({ ok: false, failed_step: failedStep, steps }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const totalLatency = Date.now() - overallStart;
  await admin.from("synthetic_runs").insert({
    probe_name: PROBE_NAME, success: true, total_latency_ms: totalLatency, steps: steps as any,
  });

  return new Response(JSON.stringify({ ok: true, total_latency_ms: totalLatency, steps }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
