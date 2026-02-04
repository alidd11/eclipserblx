import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate the caller using the user's token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requesterId = userData.user.id;

    // Use service role for staff directory queries
    const service = createClient(supabaseUrl, supabaseServiceKey);

    // Ensure requester is staff
    const { data: requesterRoles, error: requesterRolesError } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", requesterId)
      .limit(1);

    if (requesterRolesError) throw requesterRolesError;
    if (!requesterRoles || requesterRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all user roles
    const { data: allRoles, error: allRolesError } = await service
      .from("user_roles")
      .select("user_id, role");

    if (allRolesError) throw allRolesError;

    // Status-based roles that don't qualify as "staff"
    const statusOnlyRoles = ['eclipse_plus_member', 'seller', 'customer'];
    
    // Group roles by user
    const userRolesMap = new Map<string, string[]>();
    (allRoles ?? []).forEach(r => {
      const existing = userRolesMap.get(r.user_id) || [];
      existing.push(r.role);
      userRolesMap.set(r.user_id, existing);
    });
    
    // Only include users who have at least one actual staff role
    const staffIds = Array.from(userRolesMap.entries())
      .filter(([_, roles]) => roles.some(role => !statusOnlyRoles.includes(role)))
      .map(([userId]) => userId);

    if (staffIds.length === 0) {
      return new Response(JSON.stringify({ staff: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profiles for staff members (excluding email for privacy)
    const { data: staffProfiles, error: profilesError } = await service
      .from("profiles")
      .select("user_id, display_name, last_seen")
      .in("user_id", staffIds);

    if (profilesError) throw profilesError;

    return new Response(JSON.stringify({ staff: staffProfiles ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("list-staff error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
