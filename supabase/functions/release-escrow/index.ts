import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Auth guard: require service-role or authenticated staff
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const isServiceRole = token === supabaseServiceKey;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    if (!isServiceRole) {
      if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    console.log("[release-escrow] Starting escrow release check...");

    // Call the database function that handles the atomic release
    const { data, error } = await supabase.rpc("release_escrow_funds");

    if (error) {
      console.error("[release-escrow] RPC error:", error.message);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = data?.[0] || { released_count: 0, total_released: 0 };
    console.log(
      `[release-escrow] Released ${result.released_count} transactions, total £${result.total_released}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        released_count: result.released_count,
        total_released: result.total_released,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[release-escrow] Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
