// Orion inbound command receiver for RoleplayHub.
// Verifies HMAC, persists the command, executes the allowlisted action,
// returns the result. All commands are auditable in `orion_inbound_commands`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { verifyOrionSignature } from "../_shared/orionHmac.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-orion-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Command =
  | { type: "ping" }
  | { type: "data.query"; metric?: string; params?: Record<string, unknown> }
  | { type: "notification.send"; title: string; body: string; user_id?: string }
  | { type: "order.flag"; order_id: string; flag: string; note?: string }
  | { type: "product.flag"; product_id: string; reason: string }
  | { type: "incident.open"; title: string; severity?: string; description?: string }
  | { type: "finding.raise"; kind: string; title: string; root_cause?: string; evidence?: unknown }
  | {
      type: "change.propose";
      external_id?: string;
      proposing_agent: string;
      board_meeting_id?: string;
      title: string;
      rationale: string;
      category: "copy" | "feature_flag" | "pricing" | "notification_template" | "cron_toggle" | "schema" | "code" | "other";
      risk_level?: "low" | "medium" | "high" | "critical";
      proposal: Record<string, unknown>;
      transcript?: unknown;
    };

function daysAgoISO(d: number): string {
  return new Date(Date.now() - d * 86400000).toISOString();
}

// deno-lint-ignore no-explicit-any
async function handleDataQuery(sb: any, command: any) {
  const metric = command.metric || "summary";
  const params = command.params || {};
  const days = Number(params.days) || 7;
  const sinceISO = daysAgoISO(days);
  try {
    switch (metric) {
      case "summary": {
        const [stores, activeStores, recentOrders, products, users] = await Promise.all([
          sb.from("stores").select("*", { count: "exact", head: true }),
          sb.from("stores").select("*", { count: "exact", head: true }).eq("is_active", true),
          sb.from("orders").select("*", { count: "exact", head: true }).gte("created_at", sinceISO),
          sb.from("products").select("*", { count: "exact", head: true }).eq("is_published", true),
          sb.from("profiles").select("*", { count: "exact", head: true }),
        ]);
        return {
          total_stores: stores.count ?? 0,
          active_stores: activeStores.count ?? 0,
          orders_recent: recentOrders.count ?? 0,
          published_products: products.count ?? 0,
          users: users.count ?? 0,
          window_days: days,
        };
      }
      case "orders_recent": {
        const { count } = await sb.from("orders")
          .select("*", { count: "exact", head: true }).gte("created_at", sinceISO);
        return { orders: count ?? 0, window_days: days };
      }
      case "revenue_summary": {
        const { data, error } = await sb.from("orders")
          .select("total_amount, status").gte("created_at", sinceISO);
        if (error) return { error: String(error.message ?? error) };
        const rows = data ?? [];
        const gross = rows.reduce((s: number, r: { total_amount: number | null }) => s + (Number(r.total_amount) || 0), 0);
        const paid = rows.filter((r: { status: string }) => r.status === "paid" || r.status === "completed").length;
        return {
          gross_amount: Math.round(gross * 100) / 100,
          order_count: rows.length,
          paid_count: paid,
          window_days: days,
        };
      }
      case "top_stores": {
        const { data } = await sb.from("orders")
          .select("store_id").gte("created_at", sinceISO);
        const counts: Record<string, number> = {};
        (data ?? []).forEach((o: { store_id: string }) => {
          counts[o.store_id] = (counts[o.store_id] || 0) + 1;
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const ids = sorted.map(([id]) => id);
        const { data: names } = await sb.from("stores").select("id, name").in("id", ids);
        const nameMap: Record<string, string> = {};
        (names ?? []).forEach((s: { id: string; name: string }) => { nameMap[s.id] = s.name; });
        return {
          top: sorted.map(([id, n]) => ({ id, name: nameMap[id] ?? "unknown", orders: n })),
          window_days: days,
        };
      }
      case "incidents_open": {
        const { data, count } = await sb.from("incidents")
          .select("id, title, severity, status, created_at", { count: "exact" })
          .neq("status", "resolved").order("created_at", { ascending: false }).limit(20);
        return { count: count ?? 0, incidents: data ?? [] };
      }
      case "signups_recent": {
        const { count } = await sb.from("profiles")
          .select("*", { count: "exact", head: true }).gte("created_at", sinceISO);
        return { signups: count ?? 0, window_days: days };
      }
      default:
        return { error: `Unknown metric: ${metric}` };
    }
  } catch (e) {
    return { error: String((e as Error).message ?? e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405, headers: corsHeaders });
  }

  const secret = Deno.env.get("ORION_WEBHOOK_SECRET");
  if (!secret) {
    return new Response(JSON.stringify({ error: "missing_secret" }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const raw = await req.text();
  const sigHeader = req.headers.get("x-orion-signature");
  const valid = await verifyOrionSignature(secret, raw, sigHeader);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let cmd: Command;
  try { cmd = JSON.parse(raw); } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: logRow } = await sb.from("orion_inbound_commands").insert({
    command_type: cmd.type,
    payload: cmd as unknown as Record<string, unknown>,
    signature_valid: valid,
    status: valid ? "pending" : "rejected",
    error: valid ? null : "invalid_signature",
  }).select("id").single();

  if (!valid) {
    return new Response(JSON.stringify({ error: "invalid_signature" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let result: Record<string, unknown> = { ok: true };
  let status: "executed" | "failed" = "executed";
  let err: string | null = null;

  try {
    switch (cmd.type) {
      case "ping":
        result = { pong: true, at: new Date().toISOString() };
        break;
      case "data.query":
        result = await handleDataQuery(sb, cmd) as Record<string, unknown>;
        break;
      case "notification.send": {
        const { error } = await sb.from("notifications").insert({
          user_id: cmd.user_id ?? null,
          title: cmd.title,
          message: cmd.body,
          type: "orion",
        });
        if (error) throw error;
        result = { sent: true };
        break;
      }
      case "order.flag": {
        const { error } = await sb.from("orders")
          .update({ notes: `[orion:${cmd.flag}] ${cmd.note ?? ""}`.trim() })
          .eq("id", cmd.order_id);
        if (error) throw error;
        result = { order_id: cmd.order_id, flag: cmd.flag };
        break;
      }
      case "product.flag": {
        const { error } = await sb.from("compliance_violations").insert({
          subject_type: "product",
          subject_id: cmd.product_id,
          reason: cmd.reason,
          raised_by: "orion",
          status: "open",
        });
        if (error) throw error;
        result = { product_id: cmd.product_id };
        break;
      }
      case "incident.open": {
        const { data, error } = await sb.from("incidents").insert({
          title: cmd.title,
          severity: cmd.severity ?? "medium",
          description: cmd.description ?? null,
          status: "open",
        }).select("id").single();
        if (error) throw error;
        result = { incident_id: data?.id };
        break;
      }
      case "finding.raise": {
        const { data, error } = await sb.from("orion_findings").insert({
          kind: cmd.kind,
          title: cmd.title,
          root_cause: cmd.root_cause ?? null,
          evidence: cmd.evidence ?? [],
          raised_by: "orion",
          status: "open",
        }).select("id").single();
        if (error) throw error;
        result = { finding_id: data?.id };
        break;
      }
      case "change.propose": {
        const { data, error } = await sb.from("orion_change_requests").insert({
          external_id: cmd.external_id ?? null,
          proposing_agent: cmd.proposing_agent,
          board_meeting_id: cmd.board_meeting_id ?? null,
          title: cmd.title,
          rationale: cmd.rationale,
          category: cmd.category,
          risk_level: cmd.risk_level ?? "medium",
          proposal: cmd.proposal ?? {},
          transcript: cmd.transcript ?? null,
        }).select("id").single();
        if (error) throw error;
        result = { change_request_id: data?.id, status: "pending_review" };
        break;
      }
      default:
        status = "failed";
        err = `unknown_command_type:${(cmd as { type: string }).type}`;
    }
  } catch (e) {
    status = "failed";
    err = String((e as Error).message ?? e).slice(0, 1000);
  }

  if (logRow?.id) {
    await sb.from("orion_inbound_commands").update({
      status,
      result,
      error: err,
      executed_at: new Date().toISOString(),
    }).eq("id", logRow.id);
  }

  return new Response(JSON.stringify({ status, result, error: err }), {
    status: status === "executed" ? 200 : 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
