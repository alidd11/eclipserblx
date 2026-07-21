import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Blocked disposable email domains
const BLOCKED_DOMAINS = [
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit - auth-tier strictness
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: clientIp, action: 'update-user-email' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the calling user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callingUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // This function exists solely to let OAuth signups without a real email
    // (Discord/Roblox) complete their profile once — it must never be usable
    // to change an already-verified account's email, since it skips the
    // normal confirm-the-new-address flow entirely.
    if (!callingUser.email?.endsWith(".placeholder.local")) {
      return new Response(JSON.stringify({ error: "This account already has a verified email" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Validate email format and length
    if (!EMAIL_REGEX.test(normalizedEmail) || normalizedEmail.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Block placeholder and disposable domains
    const domain = normalizedEmail.split('@')[1];
    if (domain?.endsWith(".placeholder.local") || BLOCKED_DOMAINS.includes(domain)) {
      return new Response(JSON.stringify({ error: "Please provide a valid email address" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent no-op updates
    if (normalizedEmail === callingUser.email?.toLowerCase()) {
      return new Response(JSON.stringify({ error: "This is already your current email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if email is already used by another user
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", normalizedEmail)
      .neq("user_id", callingUser.id)
      .maybeSingle();

    if (existingProfile) {
      return new Response(JSON.stringify({ error: "This email is already associated with another account" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update auth.users email via admin API
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(callingUser.id, {
      email: normalizedEmail,
      email_confirm: true,
    });

    if (updateAuthError) {
      console.error("Failed to update auth email:", updateAuthError.message);
      return new Response(JSON.stringify({ error: "Failed to update email" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profiles table
    await supabase
      .from("profiles")
      .update({ email: normalizedEmail })
      .eq("user_id", callingUser.id);

    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: callingUser.id,
      action: "email_updated",
      resource: "profiles",
      details: { new_email_domain: domain },
    });

    console.log(`Email updated for user ${callingUser.id}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("update-user-email error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
