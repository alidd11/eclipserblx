import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit
  const clientIp = getClientIp(req);
  const rl = checkRateLimit({ ...RATE_LIMITS.EXPENSIVE, identifier: clientIp, action: 'notify-seller-document' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    // Auth guard: require service-role key
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      return new Response(JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { document_id, title, category } = await req.json();

    if (!document_id || !UUID_REGEX.test(document_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid document_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!title || typeof title !== 'string' || title.length > 300) {
      return new Response(
        JSON.stringify({ error: "Invalid title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[notify-seller-document] Sending notifications for document: ${title}`);

    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select("id, owner_id")
      .eq("is_active", true);

    if (storesError) {
      throw storesError;
    }

    if (!stores || stores.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notifications = stores.map((store) => ({
      document_id,
      store_id: store.id,
    }));

    const { error: notifyError } = await supabase
      .from("seller_document_notifications")
      .upsert(notifications, { onConflict: "document_id,store_id" });

    if (notifyError) {
      throw notifyError;
    }

    const ownerIds = stores.map((s) => s.owner_id).filter(Boolean);

    if (ownerIds.length > 0) {
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .in("user_id", ownerIds);

      if (subscriptions && subscriptions.length > 0) {
        const safeCategory = typeof category === 'string' ? category.substring(0, 50) : 'general';
        const safeTitle = title.substring(0, 200);

        for (const sub of subscriptions) {
          try {
            await supabase.functions.invoke("send-push-notification", {
              body: {
                subscription: {
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                payload: {
                  title: "New Document Available",
                  body: `A new ${safeCategory} document "${safeTitle}" has been added to your seller dashboard.`,
                  icon: "/pwa-192x192.png",
                  badge: "/pwa-192x192.png",
                  tag: `seller-document-${document_id}`,
                  data: { url: "/seller/documents" },
                },
              },
            });
          } catch (pushError) {
            console.error("[notify-seller-document] Push error:", pushError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, notified: stores.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[notify-seller-document] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
