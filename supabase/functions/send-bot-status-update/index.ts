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
        subject: `Bot Installation Verified - ${productName}`,
        title: 'INSTALLATION VERIFIED',
        iconEmoji: '✓',
        iconBorderColor: 'rgba(34, 197, 94, 0.3)',
        iconBgColor: 'rgba(34, 197, 94, 0.1)',
        iconColor: '#22c55e',
        message: `Your installation code for <strong>${productName}</strong>${serverInfo} has been verified by our team.`,
        details: 'Our team will begin the installation process shortly. You will receive another email when we start working on your bot.',
        statusLabel: 'Verified',
        statusColor: '#22c55e',
      };
    case 'installing':
      return {
        subject: `Bot Installation Started - ${productName}`,
        title: 'INSTALLATION IN PROGRESS',
        iconEmoji: '⚡',
        iconBorderColor: 'rgba(59, 130, 246, 0.3)',
        iconBgColor: 'rgba(59, 130, 246, 0.1)',
        iconColor: '#3b82f6',
        message: `We have started installing <strong>${productName}</strong>${serverInfo}.`,
        details: 'Our team is actively working on setting up your bot. This process typically takes 24-48 hours. We will notify you once the installation is complete.',
        statusLabel: 'Installing',
        statusColor: '#3b82f6',
      };
    case 'completed':
      return {
        subject: `Bot Installation Complete - ${productName}`,
        title: 'INSTALLATION COMPLETE',
        iconEmoji: '🎉',
        iconBorderColor: 'rgba(168, 85, 247, 0.3)',
        iconBgColor: 'rgba(168, 85, 247, 0.1)',
        iconColor: '#a855f7',
        message: `Your <strong>${productName}</strong>${serverInfo} has been successfully installed and is now ready to use!`,
        details: 'Your bot is now live and operational. If you have any questions or need assistance, please open a support ticket.',
        statusLabel: 'Completed',
        statusColor: '#a855f7',
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
  <title>${content.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Rajdhani:wght@400;500;600&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Rajdhani', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16161a 100%); border-radius: 16px; overflow: hidden; border: 1px solid #2d2d2d;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1e2e 0%, #0d0d0d 100%); padding: 32px 40px; text-align: center; border-bottom: 1px solid ${content.iconColor};">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="width: 64px; height: 64px; background: ${content.iconBgColor}; border: 2px solid ${content.iconBorderColor}; border-radius: 50%; display: inline-block; margin-bottom: 16px;">
                      <span style="font-size: 28px; line-height: 64px;">${content.iconEmoji}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; font-family: 'Cinzel', serif; letter-spacing: 2px;">
                      ${content.title}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Status Badge -->
          <tr>
            <td style="padding: 32px 40px 0 40px; text-align: center;">
              <span style="display: inline-block; background: ${content.iconBgColor}; border: 1px solid ${content.iconBorderColor}; color: ${content.statusColor}; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                ${content.statusLabel}
              </span>
            </td>
          </tr>
          
          <!-- Product Info -->
          <tr>
            <td style="padding: 24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(168, 85, 247, 0.1); border-radius: 12px; border: 1px solid rgba(168, 85, 247, 0.2);">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; color: #a0a0a0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Product</p>
                    <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600;">${data.productName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 20px 20px 20px;">
                    <p style="margin: 0 0 8px 0; color: #a0a0a0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Installation Code</p>
                    <p style="margin: 0; color: #a855f7; font-size: 16px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 2px;">${data.installationCode}</p>
                  </td>
                </tr>
                ${data.discordGuildName ? `
                <tr>
                  <td style="padding: 0 20px 20px 20px;">
                    <p style="margin: 0 0 8px 0; color: #a0a0a0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Discord Server</p>
                    <p style="margin: 0; color: #5865F2; font-size: 16px; font-weight: 600;">${data.discordGuildName}</p>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>
          
          <!-- Message -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <p style="margin: 0 0 16px 0; color: #e0e0e0; font-size: 16px; line-height: 1.6;">
                ${content.message}
              </p>
              <p style="margin: 0; color: #a0a0a0; font-size: 14px; line-height: 1.6;">
                ${content.details}
              </p>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <a href="https://eclipserblx.com/downloads" style="display: inline-block; background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-right: 12px;">
                View Status
              </a>
              <a href="https://eclipserblx.com/support" style="display: inline-block; background: transparent; color: #a855f7; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; border: 1px solid rgba(168, 85, 247, 0.5);">
                Contact Support
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #0d0d0d; padding: 24px 40px; text-align: center; border-top: 1px solid #2d2d2d;">
              <p style="margin: 0 0 8px 0; color: #606060; font-size: 11px;">
                Questions? Contact us at <a href="mailto:support@eclipserblx.com" style="color: #a855f7; text-decoration: none;">support@eclipserblx.com</a>
              </p>
              <p style="margin: 0; color: #404040; font-size: 10px;">
                Eclipse. All rights reserved.
              </p>
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

  // Rate limiting
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

    // Validate status
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
