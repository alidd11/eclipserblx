import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  productId: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";

    // Validate the caller and get their identity (email + user id)
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = userData.user;
    const { productId } = (await req.json()) as Payload;
    if (!productId) {
      return new Response(JSON.stringify({ error: "Missing productId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Note: orders.user_id is nullable; some purchases may be recorded only by customer_email.
    // We treat a purchase as valid if either user_id matches OR customer_email matches.
    const email = user.email ?? "";
    const paidStatuses = ["paid", "fulfilled"]; // keep strict: only paid/fulfilled are considered a purchase

    const { data, error } = await admin
      .from("orders")
      .select("id, user_id, customer_email, status, order_items!inner(product_id)")
      .in("status", paidStatuses)
      .eq("order_items.product_id", productId)
      .or(`user_id.eq.${user.id}${email ? `,customer_email.eq.${email}` : ""}`)
      .limit(1);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ hasPurchased: (data?.length ?? 0) > 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
