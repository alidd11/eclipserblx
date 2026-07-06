import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  store_id: z.string().uuid(),
  event_type: z.string().min(1).max(100),
  payload: z.record(z.unknown()),
});

async function hmacSign(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders }
  const _unauth = requireServiceRole(req, corsHeaders);
  if (_unauth) return _unauth;
);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { store_id, event_type, payload } = parsed.data;

    // Fetch active webhooks for this store that subscribe to this event
    const { data: webhooks, error } = await supabase
      .from("seller_webhooks")
      .select("id, url, secret, events")
      .eq("store_id", store_id)
      .eq("is_active", true);

    if (error) throw error;

    const matching = (webhooks ?? []).filter((wh: any) =>
      (wh.events as string[]).includes(event_type)
    );

    const results: any[] = [];

    for (const wh of matching) {
      const body = JSON.stringify({
        event: event_type,
        timestamp: new Date().toISOString(),
        data: payload,
      });

      const signature = await hmacSign(wh.secret, body);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const start = Date.now();

      let statusCode = 0;
      let responseBody = "";

      try {
        const res = await fetch(wh.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": event_type,
          },
          body,
          signal: controller.signal,
        });
        statusCode = res.status;
        responseBody = await res.text();
      } catch (e: any) {
        statusCode = 0;
        responseBody = e.message ?? "Connection failed";
      } finally {
        clearTimeout(timeout);
      }

      const latencyMs = Date.now() - start;

      // Log delivery
      await supabase.from("seller_webhook_logs").insert({
        webhook_id: wh.id,
        event_type,
        payload,
        status_code: statusCode,
        response_body: responseBody.slice(0, 500),
        latency_ms: latencyMs,
      });

      // Update webhook last trigger info
      await supabase
        .from("seller_webhooks")
        .update({ last_triggered_at: new Date().toISOString(), last_status_code: statusCode })
        .eq("id", wh.id);

      results.push({ webhook_id: wh.id, status_code: statusCode, latency_ms: latencyMs });
    }

    return new Response(
      JSON.stringify({ delivered: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
