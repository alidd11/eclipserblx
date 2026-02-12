import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SellerStatusRequest {
  seller_name: string;
  seller_email: string;
  store_name: string;
  status: 'approved' | 'rejected';
  rejection_reason?: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[SEND-SELLER-APPLICATION-STATUS] ${step}`, details ? JSON.stringify(details) : '');
};

const getApprovedContent = (seller_name: string, store_name: string) => ({
  subject: `Your store "${store_name}" has been approved!`,
  title: 'Application Approved',
  message: `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">Hi ${seller_name},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
      Great news — your seller application for <strong style="color: #e4e4e7;">${store_name}</strong> has been approved. Your store is now live on Eclipse.
    </p>
    <p style="margin: 0 0 8px 0; font-size: 14px; color: #e4e4e7; font-weight: 600;">Here's what to do next:</p>
    <table width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 16px 0;">
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #1a1a2e;">
          <span style="font-size: 13px; color: #a855f7; font-weight: 600;">1.</span>
          <span style="font-size: 13px; color: #a3a3a3; margin-left: 8px;">Sign the <strong style="color: #e4e4e7;">Seller Terms of Service</strong> in your dashboard under Documents</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #1a1a2e;">
          <span style="font-size: 13px; color: #a855f7; font-weight: 600;">2.</span>
          <span style="font-size: 13px; color: #a3a3a3; margin-left: 8px;">Set up your <strong style="color: #e4e4e7;">store branding</strong> — add a logo, banner, and description</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #1a1a2e;">
          <span style="font-size: 13px; color: #a855f7; font-weight: 600;">3.</span>
          <span style="font-size: 13px; color: #a3a3a3; margin-left: 8px;">Upload your first product and set pricing</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #1a1a2e;">
          <span style="font-size: 13px; color: #a855f7; font-weight: 600;">4.</span>
          <span style="font-size: 13px; color: #a3a3a3; margin-left: 8px;">Set up your <strong style="color: #e4e4e7;">payout details</strong> so you can receive earnings</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 0;">
          <span style="font-size: 13px; color: #a855f7; font-weight: 600;">5.</span>
          <span style="font-size: 13px; color: #a3a3a3; margin-left: 8px;">Read the <strong style="color: #e4e4e7;">Knowledge Base</strong> for commission rates, policies, and tips</span>
        </td>
      </tr>
    </table>
    <table cellspacing="0" cellpadding="0" style="margin: 0 0 16px 0;">
      <tr>
        <td style="background: linear-gradient(135deg, #a855f7, #7c3aed); border-radius: 6px;">
          <a href="https://eclipserblx.com/seller" style="display: inline-block; padding: 10px 24px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600;">Go to Seller Dashboard</a>
        </td>
      </tr>
    </table>
    <p style="margin: 0; font-size: 13px; color: #525252; line-height: 1.6;">
      Your linked Discord and Roblox accounts have been locked for security. Contact support if you need changes.
    </p>
  `,
});

const getRejectedContent = (seller_name: string, store_name: string, reason?: string) => ({
  subject: `Update on your "${store_name}" seller application`,
  title: 'Application Not Approved',
  message: `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">Hi ${seller_name},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
      Thanks for applying to sell on Eclipse with <strong style="color: #e4e4e7;">${store_name}</strong>. After reviewing your application, we're unable to approve it at this time.
    </p>
    ${reason ? `
    <div style="background: #1a1a2e; border-left: 3px solid #a855f7; padding: 12px 16px; margin: 0 0 16px 0; border-radius: 0 6px 6px 0;">
      <p style="margin: 0 0 4px 0; font-size: 12px; color: #a855f7; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Reason</p>
      <p style="margin: 0; font-size: 14px; color: #a3a3a3; line-height: 1.5;">${reason}</p>
    </div>
    ` : ''}
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
      You're welcome to reapply in the future once the issues above have been addressed. If you believe this was a mistake, reach out to our support team.
    </p>
    <table cellspacing="0" cellpadding="0" style="margin: 0 0 16px 0;">
      <tr>
        <td style="border: 1px solid #333; border-radius: 6px;">
          <a href="https://eclipserblx.com/contact" style="display: inline-block; padding: 10px 24px; color: #a3a3a3; text-decoration: none; font-size: 14px; font-weight: 500;">Contact Support</a>
        </td>
      </tr>
    </table>
  `,
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { seller_name, seller_email, store_name, status, rejection_reason }: SellerStatusRequest = await req.json();
    
    logStep("Received request", { seller_name, seller_email, store_name, status });

    if (!seller_email || !seller_name || !store_name || !status) {
      throw new Error("Missing required fields");
    }

    const content = status === 'approved' 
      ? getApprovedContent(seller_name, store_name)
      : getRejectedContent(seller_name, store_name, rejection_reason);

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
              <h1 style="font-size: 22px; font-weight: 600; color: #ffffff; margin: 0 0 20px 0;">${content.title}</h1>
              ${content.message}
              <p style="margin: 24px 0 0 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                Cheers,<br>
                <strong style="color: #e4e4e7;">The Eclipse Team</strong>
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

    logStep("Sending seller application status email");

    const emailResponse = await resend.emails.send({
      from: "Eclipse <noreply@eclipserblx.com>",
      to: [seller_email],
      subject: content.subject,
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
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
