import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit
    const clientIp = getClientIp(req);
    const rl = checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: clientIp, action: 'send-compensation-email' });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    // Authenticate and verify admin/staff
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    // Verify staff/admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isStaff = roles?.some(r => ['admin', 'staff', 'moderator', 'head_moderator'].includes(r.role));
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden: Staff access required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403,
      });
    }

    const { to, name, subject, html } = await req.json();

    // Validate inputs
    if (!to || typeof to !== 'string' || !EMAIL_REGEX.test(to) || to.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    if (!subject || typeof subject !== 'string' || subject.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid subject" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    if (!html || typeof html !== 'string' || html.length > 50000) {
      return new Response(JSON.stringify({ error: "Invalid email body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const { data, error } = await resend.emails.send({
      from: "Eclipse <noreply@eclipserblx.com>",
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) throw new Error(JSON.stringify(error));

    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "compensation_email_sent",
      resource: "emails",
      details: { to, subject, sent_by: user.email },
    });

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
