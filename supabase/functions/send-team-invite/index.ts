import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TeamInviteRequest {
  email: string;
  store_name: string;
  inviter_name: string;
  role: string;
  invite_token: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[SEND-TEAM-INVITE] ${step}`, details ? JSON.stringify(details) : '');
};

const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'admin': return 'Admin';
    case 'editor': return 'Editor';
    case 'viewer': return 'Viewer';
    default: return role.charAt(0).toUpperCase() + role.slice(1);
  }
};

const getRoleDescription = (role: string): string => {
  switch (role) {
    case 'admin': return 'Full access to manage products, orders, settings, and team members.';
    case 'editor': return 'Can manage products and orders, but cannot change store settings or team.';
    case 'viewer': return 'View-only access to store analytics and order history.';
    default: return '';
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, store_name, inviter_name, role, invite_token }: TeamInviteRequest = await req.json();
    
    logStep("Received request", { email, store_name, inviter_name, role });

    if (!email || !store_name || !role || !invite_token) {
      throw new Error("Missing required fields: email, store_name, role, or invite_token");
    }

    const acceptUrl = `https://eclipserblx.com/seller/team/accept?token=${invite_token}`;
    const roleLabel = getRoleLabel(role);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0f;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="520" cellspacing="0" cellpadding="0" style="max-width: 520px;">
          <tr>
            <td style="padding-bottom: 32px;">
              <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: Georgia, serif;">ECLIPSE</span>
            </td>
          </tr>
          <tr>
            <td>
              <h1 style="font-size: 22px; font-weight: 600; color: #ffffff; margin: 0 0 20px 0;">Team invitation</h1>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                ${inviter_name || 'A store owner'} has invited you to join <strong style="color: #e4e4e7;">${store_name}</strong> as a <strong style="color: #e4e4e7;">${roleLabel}</strong>.
              </p>
              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Your role: ${roleLabel}</p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #a3a3a3; line-height: 1.6;">${getRoleDescription(role)}</p>
              <a href="${acceptUrl}" target="_blank" style="display: inline-block; background: #a855f7; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Accept Invitation
              </a>
              <p style="margin: 20px 0 0 0; font-size: 13px; color: #737373; line-height: 1.6;">
                Or copy this link: <span style="color: #a855f7; word-break: break-all;">${acceptUrl}</span>
              </p>
              <p style="margin: 16px 0 0 0; font-size: 13px; color: #525252;">
                This invitation expires in 7 days. If you didn't expect this, you can ignore it.
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #222; padding-top: 24px; margin-top: 32px;">
              <p style="margin: 0; font-size: 11px; color: #404040;">Eclipse &middot; <a href="https://eclipserblx.com" style="color: #737373; text-decoration: none;">eclipserblx.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    logStep("Sending invitation email");

    const emailResponse = await resend.emails.send({
      from: "Eclipse <noreply@eclipserblx.com>",
      to: [email],
      subject: `You're invited to join ${store_name} on Eclipse`,
      html: emailHtml,
    });

    logStep("Email sent successfully", { response: emailResponse });

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("Error sending email", { error: error.message });
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);