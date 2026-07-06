// nightly-reconciliation — calls the SQL routine that scans for data drift.
// Findings appear in the admin observability dashboard.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  const _unauth = requireServiceRole(req, corsHeaders);
  if (_unauth) return _unauth;

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await admin.rpc("run_nightly_reconciliation");

  if (error) {
    console.error("[Reconciliation] failed:", error.message);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, ...(data as object) }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
