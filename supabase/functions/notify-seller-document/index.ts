import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyDocumentRequest {
  document_id: string;
  title: string;
  category: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { document_id, title, category }: NotifyDocumentRequest = await req.json();

    if (!document_id || !title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[notify-seller-document] Sending notifications for document: ${title}`);

    // Get all active stores
    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select("id, owner_id")
      .eq("is_active", true);

    if (storesError) {
      console.error("[notify-seller-document] Error fetching stores:", storesError);
      throw storesError;
    }

    if (!stores || stores.length === 0) {
      console.log("[notify-seller-document] No active stores to notify");
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create notifications for each store
    const notifications = stores.map((store) => ({
      document_id,
      store_id: store.id,
    }));

    const { error: notifyError } = await supabase
      .from("seller_document_notifications")
      .upsert(notifications, { onConflict: "document_id,store_id" });

    if (notifyError) {
      console.error("[notify-seller-document] Error creating notifications:", notifyError);
      throw notifyError;
    }

    // Get push subscriptions for all store owners
    const ownerIds = stores.map((s) => s.owner_id).filter(Boolean);

    if (ownerIds.length > 0) {
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .in("user_id", ownerIds);

      if (subscriptions && subscriptions.length > 0) {
        console.log(`[notify-seller-document] Sending push to ${subscriptions.length} devices`);

        // Call send-push-notification for each subscription
        for (const sub of subscriptions) {
          try {
            await supabase.functions.invoke("send-push-notification", {
              body: {
                subscription: {
                  endpoint: sub.endpoint,
                  keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                  },
                },
                payload: {
                  title: "New Document Available",
                  body: `A new ${category} document "${title}" has been added to your seller dashboard.`,
                  icon: "/pwa-192x192.png",
                  badge: "/pwa-192x192.png",
                  tag: `seller-document-${document_id}`,
                  data: {
                    url: "/seller/documents",
                  },
                },
              },
            });
          } catch (pushError) {
            console.error("[notify-seller-document] Push error:", pushError);
          }
        }
      }
    }

    console.log(`[notify-seller-document] Notified ${stores.length} stores`);

    return new Response(
      JSON.stringify({ success: true, notified: stores.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[notify-seller-document] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
