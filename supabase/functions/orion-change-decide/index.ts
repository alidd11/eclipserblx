// Admin endpoint to approve or reject an Orion change request.
// Requires an authenticated admin user. On approval, the `feature_flag`
// category auto-applies; other categories are marked approved for human
// implementation. Always emits a `change.decision` event to the outbox.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AUTO_APPLY = new Set(["feature_flag"]);

type Body = {
  change_request_id: string;
  decision: "approve" | "reject";
  decision_notes?: string;
};

function j(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return j({ error: "unauthorised" }, 401);
  const token = authHeader.slice(7);

  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data: userData, error: userErr } = await anon.auth.getUser(token);
  if (userErr || !userData?.user) return j({ error: "unauthorised" }, 401);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Verify admin role
  const { data: isAdmin } = await sb.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  const { data: isSuper } = await sb.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "super_admin",
  });
  if (!isAdmin && !isSuper) return j({ error: "forbidden" }, 403);

  let body: Body;
  try { body = await req.json(); }
  catch { return j({ error: "invalid_json" }, 400); }

  if (!body.change_request_id || !["approve", "reject"].includes(body.decision)) {
    return j({ error: "invalid_body" }, 400);
  }

  const { data: cr, error: fetchErr } = await sb
    .from("orion_change_requests")
    .select("*").eq("id", body.change_request_id).maybeSingle();
  if (fetchErr || !cr) return j({ error: "not_found" }, 404);
  if (cr.status !== "pending_review") return j({ error: "already_decided", status: cr.status }, 409);

  const reviewer = userData.user.id;

  if (body.decision === "reject") {
    await sb.from("orion_change_requests").update({
      status: "rejected",
      decision_notes: body.decision_notes ?? null,
      reviewed_by: reviewer,
      reviewed_at: new Date().toISOString(),
    }).eq("id", cr.id);
    await enqueueDecision(sb, cr.id, cr.external_id, "rejected", body.decision_notes);
    return j({ status: "rejected" });
  }

  let newStatus: "approved" | "applied" | "failed" = "approved";
  let applyResult: Record<string, unknown> | null = null;
  let applyError: string | null = null;

  if (AUTO_APPLY.has(cr.category)) {
    try {
      applyResult = await applyChange(sb, cr.category, cr.proposal ?? {});
      newStatus = "applied";
    } catch (e) {
      applyError = String((e as Error).message ?? e).slice(0, 1000);
      newStatus = "failed";
    }
  }

  await sb.from("orion_change_requests").update({
    status: newStatus,
    decision_notes: body.decision_notes ?? null,
    reviewed_by: reviewer,
    reviewed_at: new Date().toISOString(),
    applied_at: newStatus === "applied" ? new Date().toISOString() : null,
    apply_result: applyResult,
    apply_error: applyError,
  }).eq("id", cr.id);

  await enqueueDecision(sb, cr.id, cr.external_id, newStatus, body.decision_notes, applyResult, applyError);
  return j({ status: newStatus, apply_result: applyResult, apply_error: applyError });
});

// deno-lint-ignore no-explicit-any
async function applyChange(sb: any, category: string, proposal: Record<string, unknown>) {
  switch (category) {
    case "feature_flag": {
      const key = String(proposal.key ?? "");
      if (!key) throw new Error("missing_flag_key");
      const enabled = Boolean(proposal.enabled);
      const { error } = await sb.from("feature_flags").update({ enabled }).eq("key", key);
      if (error) throw error;
      return { key, enabled };
    }
    default:
      throw new Error("unsupported_auto_apply_category");
  }
}

async function enqueueDecision(
  // deno-lint-ignore no-explicit-any
  sb: any,
  id: string,
  externalId: string | null,
  status: string,
  notes?: string | null,
  applyResult: Record<string, unknown> | null = null,
  applyError: string | null = null,
) {
  await sb.from("orion_event_outbox").insert({
    event_type: "change.decision",
    payload: {
      change_request_id: id,
      external_id: externalId,
      status,
      decision_notes: notes ?? null,
      apply_result: applyResult,
      apply_error: applyError,
      decided_at: new Date().toISOString(),
    },
  });
}
