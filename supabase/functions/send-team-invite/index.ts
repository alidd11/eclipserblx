import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = new Set(['manager', 'editor', 'viewer']);

function escapeHtml(text: string): string {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'manager': return 'Manager';
    case 'editor': return 'Editor';
    case 'viewer': return 'Viewer';
    default: return 'Member';
  }
};

const getRoleDescription = (role: string): string => {
  switch (role) {
    case 'manager': return 'Can manage products, orders, and team settings.';
    case 'editor': return 'Can edit products and view orders.';
    case 'viewer': return 'View-only access to store data.';
    default: return '';
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit
  const clientIp = getClientIp(req);
  const rl = checkRateLimit({ ...RATE_LIMITS.WRITE, identifier: clientIp, action: 'send-team-invite' });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    // Auth guard: require service-role or authenticated user
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const isServiceRole = token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let callingUserId: string | null = null;

    if (!isServiceRole) {
      if (!token) {
        return new Response(JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      callingUserId = user.id;
    }

    const { invite_token, inviter_name } = await req.json();

    if (!invite_token || typeof invite_token !== 'string' || invite_token.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid invite_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Look up the invite server-side — email, role, and store_name come from
    // this verified row, never from the client, and we confirm the caller
    // actually owns the store the invite belongs to (service-role callers,
    // e.g. automated resends, skip the ownership check).
    const { data: invite } = await supabase
      .from("store_team_invites")
      .select("email, role, store_id, stores(name, owner_id)")
      .eq("token", invite_token)
      .maybeSingle();

    if (!invite) {
      return new Response(JSON.stringify({ error: "Invite not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const store = (invite.stores as any)?.[0] ?? invite.stores;
    if (!isServiceRole && store?.owner_id !== callingUserId) {
      return new Response(JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const email = invite.email;
    const role = invite.role;
    const store_name = store?.name || "this store";

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!role || !ALLOWED_ROLES.has(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const safeStoreName = escapeHtml(String(store_name).substring(0, 200));
    const safeInviterName = escapeHtml((typeof inviter_name === 'string' ? inviter_name : 'A store owner').substring(0, 100));
    const roleLabel = getRoleLabel(role);
    const acceptUrl = `https://eclipserblx.com/seller/team/accept?token=${encodeURIComponent(invite_token)}`;

    const emailHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0f;">
    <tr><td align="center" style="padding: 40px 20px;">
      <table width="520" cellspacing="0" cellpadding="0" style="max-width: 520px;">
        <tr><td style="padding-bottom: 32px;"><span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: Georgia, serif;">ECLIPSE</span></td></tr>
        <tr><td>
          <h1 style="font-size: 22px; font-weight: 600; color: #ffffff; margin: 0 0 20px 0;">Team invitation</h1>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">${safeInviterName} has invited you to join <strong style="color: #e4e4e7;">${safeStoreName}</strong> as a <strong style="color: #e4e4e7;">${roleLabel}</strong>.</p>
          <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Your role: ${roleLabel}</p>
          <p style="margin: 0 0 24px 0; font-size: 14px; color: #a3a3a3; line-height: 1.6;">${getRoleDescription(role)}</p>
          <a href="${acceptUrl}" target="_blank" style="display: inline-block; background: #a855f7; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: 600; font-size: 14px;">Accept Invitation</a>
          <p style="margin: 16px 0 0 0; font-size: 13px; color: #525252;">This invitation expires in 7 days.</p>
        </td></tr>
        <tr><td style="border-top: 1px solid #222; padding-top: 24px;"><p style="margin: 0; font-size: 11px; color: #404040;">Eclipse &middot; <a href="https://eclipserblx.com" style="color: #737373; text-decoration: none;">eclipserblx.com</a></p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const emailResponse = await resend.emails.send({
      from: "Eclipse <noreply@eclipserblx.com>",
      to: [email],
      subject: `You're invited to join ${store_name} on Eclipse`,
      html: emailHtml,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[SEND-TEAM-INVITE] Error:", error.message);
    return new Response(
      JSON.stringify({ error: "Failed to send invitation" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
