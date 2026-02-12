import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "../_shared/rateLimit.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BotStatusUpdateRequest {
  customerEmail: string;
  productName: string;
  installationCode: string;
  status: 'verified' | 'installing' | 'completed';
  discordGuildName?: string;
}

function logStep(step: string, details?: Record<string, unknown>) {
  console.log(`[SEND-BOT-STATUS-UPDATE] ${step}`, details ? JSON.stringify(details) : '');
}

function getStatusContent(status: string, productName: string, discordGuildName?: string) {
  const serverInfo = discordGuildName ? ` for ${discordGuildName}` : '';
  
  switch (status) {
    case 'verified':
      return {
        subject: `Bot installation verified - ${productName}`,
        title: 'Installation verified',
        message: `Your installation code for <strong style="color: #e4e4e7;">${productName}</strong>${serverInfo} has been verified. Our team will start the installation shortly and you'll get another email when we begin.`,
      };
    case 'installing':
      return {
        subject: `Bot installation started - ${productName}`,
        title: 'Installation in progress',
        message: `We've started setting up <strong style="color: #e4e4e7;">${productName}</strong>${serverInfo}. This usually takes 24-48 hours. We'll let you know once it's done.`,
      };
    case 'completed':
      return {
        subject: `Bot installation complete - ${productName}`,
        title: 'Installation complete',
        message: `<strong style="color: #e4e4e7;">${productName}</strong>${serverInfo} has been installed and is ready to use. If you run into any issues, open a support ticket.`,
      };
    default:
      return null;
  }
}

function generateEmailHtml(data: BotStatusUpdateRequest): string {
  const content = getStatusContent(data.status, data.productName, data.discordGuildName);
  if (!content) return '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width: 520px;">
          <tr>
            <td style="padding-bottom: 32px;">
              <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: Georgia, serif;">ECLIPSE</span>
            </td>
          </tr>
          <tr>
            <td>
              <h1 style="font-size: 22px; font-weight: 600; color: #ffffff; margin: 0 0 20px 0;">${content.title}</h1>
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">${content.message}</p>

              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Product</p>
              <p style="margin: 0 0 12px 0; color: #ffffff; font-size: 15px;">${data.productName}</p>

              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Installation Code</p>
              <p style="margin: 0 0 12px 0; color: #a855f7; font-size: 16px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 2px;">${data.installationCode}</p>

              ${data.discordGuildName ? `
              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Discord Server</p>
              <p style="margin: 0 0 12px 0; color: #e4e4e7; font-size: 15px;">${data.discordGuildName}</p>
              ` : ''}

              <p style="margin: 24px 0 0 0;">
                <a href="https://eclipserblx.com/downloads" style="color: #a855f7; font-size: 14px; text-decoration: none;">View status</a>
                &nbsp;&middot;&nbsp;
                <a href="https://eclipserblx.com/support" style="color: #a855f7; font-size: 14px; text-decoration: none;">Contact support</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid #222; padding-top: 24px; margin-top: 32px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #525252;">Questions? Email <a href="mailto:support@eclipserblx.com" style="color: #737373; text-decoration: none;">support@eclipserblx.com</a></p>
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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit({
    ...RATE_LIMITS.WRITE,
    identifier: clientIp,
    action: 'send-bot-status-update',
  });

  if (!rateLimitResult.allowed) {
    logStep("Rate limit exceeded", { ip: clientIp });
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const data: BotStatusUpdateRequest = await req.json();
    logStep("Processing bot status update", { 
      email: data.customerEmail, 
      status: data.status,
      product: data.productName 
    });

    if (!['verified', 'installing', 'completed'].includes(data.status)) {
      throw new Error(`Invalid status: ${data.status}`);
    }

    const content = getStatusContent(data.status, data.productName, data.discordGuildName);
    if (!content) {
      throw new Error('Failed to generate email content');
    }

    const emailHtml = generateEmailHtml(data);

    logStep("Sending status update email");
    const emailResponse = await resend.emails.send({
      from: "Eclipse <noreply@eclipserblx.com>",
      to: [data.customerEmail],
      subject: content.subject,
      html: emailHtml,
    });

    logStep("Email sent successfully", { response: emailResponse });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[SEND-BOT-STATUS-UPDATE] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);