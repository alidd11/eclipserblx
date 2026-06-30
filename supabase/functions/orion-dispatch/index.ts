// Orion outbound dispatcher.
// Drains `orion_event_outbox` and POSTs signed payloads to ORION_WEBHOOK_URL.
// Invoked by pg_cron and on-demand via direct call.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { signOrionPayload } from "../_shared/orionHmac.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BATCH = 50;
const MAX_ATTEMPTS = 8;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("ORION_WEBHOOK_URL");
  const secret = Deno.env.get("ORION_WEBHOOK_SECRET");
  if (!url || !secret) {
    return new Response(JSON.stringify({ error: "missing_orion_config" }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: rows, error } = await sb
    .from("orion_event_outbox")
    .select("id, event_type, payload, attempts")
    .is("delivered_at", null)
    .is("dead_lettered_at", null)
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(MAX_BATCH);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let delivered = 0, failed = 0, deadLettered = 0;
  for (const row of rows ?? []) {
    const body = JSON.stringify({
      id: row.id,
      type: row.event_type,
      data: row.payload,
      source: "roleplayhub",
      sent_at: new Date().toISOString(),
    });
    try {
      const sig = await signOrionPayload(secret, body);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Orion-Signature": sig,
          "X-Orion-Event": row.event_type,
        },
        body,
      });
      if (res.ok) {
        await sb.from("orion_event_outbox").update({
          delivered_at: new Date().toISOString(),
          attempts: row.attempts + 1,
          last_error: null,
        }).eq("id", row.id);
        delivered++;
      } else {
        throw new Error(`http_${res.status}: ${(await res.text()).slice(0, 500)}`);
      }
    } catch (err) {
      const attempts = row.attempts + 1;
      const backoffSec = Math.min(60 * 2 ** attempts, 3600);
      const isDead = attempts >= MAX_ATTEMPTS;
      const errMsg = String((err as Error).message ?? err).slice(0, 1000);
      await sb.from("orion_event_outbox").update({
        attempts,
        last_error: errMsg,
        next_attempt_at: new Date(Date.now() + backoffSec * 1000).toISOString(),
        dead_lettered_at: isDead ? new Date().toISOString() : null,
      }).eq("id", row.id);
      if (isDead) deadLettered++; else failed++;
    }
  }

  return new Response(
    JSON.stringify({ delivered, failed, dead_lettered: deadLettered, scanned: rows?.length ?? 0 }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
