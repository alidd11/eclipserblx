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
  <title>Team Invitation - Eclipse</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0f;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="max-width: 520px; background: linear-gradient(180deg, #151518 0%, #0d0d10 100%); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 16px; overflow: hidden;">
          
          <!-- Header with gradient accent -->
          <tr>
            <td style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 50%, transparent 100%); padding: 32px 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%); width: 44px; height: 44px; border-radius: 10px; text-align: center; vertical-align: middle;">
                          <span style="font-size: 22px; font-weight: 800; color: #ffffff; font-family: Georgia, serif;">E</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: Georgia, serif;">ECLIPSE</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Icon & Heading -->
          <tr>
            <td align="center" style="padding: 24px 40px 16px;">
              <div style="width: 64px; height: 64px; background: rgba(168, 85, 247, 0.1); border: 2px solid rgba(168, 85, 247, 0.3); border-radius: 50%; display: inline-block; line-height: 60px; text-align: center;">
                <span style="font-size: 28px; line-height: 64px; color: #a855f7;">👥</span>
              </div>
            </td>
          </tr>
          
          <tr>
            <td align="center" style="padding: 0 40px 12px;">
              <h1 style="font-size: 24px; font-weight: 700; color: #ffffff; margin: 0; font-family: Georgia, serif;">You're Invited!</h1>
            </td>
          </tr>
          
          <tr>
            <td align="center" style="padding: 0 40px 28px;">
              <p style="font-size: 14px; color: #737373; margin: 0;">Join a store team on Eclipse</p>
            </td>
          </tr>
          
          <!-- Body Text -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #e4e4e7; line-height: 1.6;">
                Hi there,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #a3a3a3; line-height: 1.7;">
                ${inviter_name || 'A store owner'} has invited you to join <strong style="color: #a855f7;">${store_name}</strong> as a <strong style="color: #e4e4e7;">${roleLabel}</strong> on Eclipse.
              </p>
            </td>
          </tr>
          
          <!-- Role Info Box -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(168, 85, 247, 0.02) 100%); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #a855f7;">Your Role: ${roleLabel}</h3>
                    <p style="margin: 0; font-size: 14px; color: #a3a3a3; line-height: 1.6;">
                      ${role === 'admin' ? 'Full access to manage products, orders, settings, and team members.' : 
                        role === 'editor' ? 'Can manage products and orders, but cannot change store settings or team.' : 
                        'View-only access to store analytics and order history.'}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 40px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%); border-radius: 8px;">
                    <a href="${acceptUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">Accept Invitation</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 40px 24px;">
              <p style="margin: 0 0 16px 0; font-size: 13px; color: #737373; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0; font-size: 12px; color: #a855f7; word-break: break-all;">
                ${acceptUrl}
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 40px 24px;">
              <p style="margin: 0; font-size: 14px; color: #737373; line-height: 1.6;">
                This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: none; border-top: 1px solid rgba(168, 85, 247, 0.15); margin: 0;">
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 40px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-right: 20px;">
                    <a href="https://eclipserblx.com" style="font-size: 12px; color: #a855f7; text-decoration: none;">Website</a>
                  </td>
                  <td style="border-left: 1px solid #333; padding-left: 20px; padding-right: 20px;">
                    <a href="https://eclipserblx.com/support" style="font-size: 12px; color: #a855f7; text-decoration: none;">Support</a>
                  </td>
                  <td style="border-left: 1px solid #333; padding-left: 20px;">
                    <a href="https://eclipserblx.com/privacy-policy" style="font-size: 12px; color: #a855f7; text-decoration: none;">Privacy</a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 11px; color: #404040; margin: 20px 0 0 0;">© 2025 Eclipse. Premium Roblox assets for UK roleplay.</p>
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
