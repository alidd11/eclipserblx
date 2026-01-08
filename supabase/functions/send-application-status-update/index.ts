import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusUpdateRequest {
  applicant_name: string;
  applicant_email: string;
  position: string;
  status: 'accepted' | 'rejected' | 'reviewing';
  custom_message?: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[SEND-APPLICATION-STATUS-UPDATE] ${step}`, details ? JSON.stringify(details) : '');
};

const getStatusContent = (status: string, position: string, applicant_name: string, custom_message?: string) => {
  switch (status) {
    case 'accepted':
      return {
        subject: `Congratulations! Your Application for ${position} Has Been Accepted`,
        iconEmoji: '✓',
        iconBorderColor: 'rgba(34, 197, 94, 0.3)',
        iconBgColor: 'rgba(34, 197, 94, 0.1)',
        title: 'Congratulations! 🎉',
        subtitle: 'Your application has been accepted',
        accentColor: '#22c55e',
        message: `
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #e4e4e7; line-height: 1.6;">
            Hi ${applicant_name},
          </p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #a3a3a3; line-height: 1.7;">
            Great news! We're thrilled to inform you that your application for the <strong style="color: #22c55e;">${position}</strong> position has been <strong style="color: #22c55e;">accepted</strong>!
          </p>
          ${custom_message ? `
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #a3a3a3; line-height: 1.7;">
            <strong style="color: #22c55e;">Message from our team:</strong><br>
            ${custom_message}
          </p>
          ` : ''}
          <p style="margin: 0; font-size: 15px; color: #a3a3a3; line-height: 1.7;">
            A member of our team will be in touch shortly with next steps. In the meantime, feel free to check the <a href="https://eclipserblx.com/jobs" style="color: #a855f7; text-decoration: none;">Jobs page</a> for any messages.
          </p>
        `,
      };
    case 'rejected':
      return {
        subject: `Update on Your ${position} Application`,
        iconEmoji: '○',
        iconBorderColor: 'rgba(107, 114, 128, 0.3)',
        iconBgColor: 'rgba(107, 114, 128, 0.1)',
        title: 'Application Update',
        subtitle: 'Thank you for your interest in Eclipse',
        accentColor: '#6b7280',
        message: `
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #e4e4e7; line-height: 1.6;">
            Hi ${applicant_name},
          </p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #a3a3a3; line-height: 1.7;">
            Thank you for taking the time to apply for the <strong style="color: #a3a3a3;">${position}</strong> position at Eclipse.
          </p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #a3a3a3; line-height: 1.7;">
            After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current needs.
          </p>
          ${custom_message ? `
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #a3a3a3; line-height: 1.7;">
            <strong style="color: #9ca3af;">Feedback from our team:</strong><br>
            ${custom_message}
          </p>
          ` : ''}
          <p style="margin: 0; font-size: 15px; color: #a3a3a3; line-height: 1.7;">
            We encourage you to apply again in the future. Keep an eye on our <a href="https://eclipserblx.com/jobs" style="color: #a855f7; text-decoration: none;">Jobs page</a> for upcoming openings.
          </p>
        `,
      };
    case 'reviewing':
      return {
        subject: `Your ${position} Application is Under Review`,
        iconEmoji: '◷',
        iconBorderColor: 'rgba(234, 179, 8, 0.3)',
        iconBgColor: 'rgba(234, 179, 8, 0.1)',
        title: 'Application Under Review',
        subtitle: "We're reviewing your application",
        accentColor: '#eab308',
        message: `
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #e4e4e7; line-height: 1.6;">
            Hi ${applicant_name},
          </p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #a3a3a3; line-height: 1.7;">
            Your application for the <strong style="color: #eab308;">${position}</strong> position is now being actively reviewed by our team.
          </p>
          ${custom_message ? `
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #a3a3a3; line-height: 1.7;">
            <strong style="color: #eab308;">Note from our team:</strong><br>
            ${custom_message}
          </p>
          ` : ''}
          <p style="margin: 0; font-size: 15px; color: #a3a3a3; line-height: 1.7;">
            We'll be in touch soon with an update. You can check your application status anytime on our <a href="https://eclipserblx.com/jobs" style="color: #a855f7; text-decoration: none;">Jobs page</a>.
          </p>
        `,
      };
    default:
      throw new Error(`Invalid status: ${status}`);
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicant_name, applicant_email, position, status, custom_message }: StatusUpdateRequest = await req.json();
    
    logStep("Received request", { applicant_name, applicant_email, position, status });

    if (!applicant_email || !applicant_name || !position || !status) {
      throw new Error("Missing required fields");
    }

    const content = getStatusContent(status, position, applicant_name, custom_message);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.subject}</title>
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
              <div style="width: 64px; height: 64px; background: ${content.iconBgColor}; border: 2px solid ${content.iconBorderColor}; border-radius: 50%; display: inline-block; line-height: 60px; text-align: center;">
                <span style="font-size: 28px; line-height: 64px; color: ${content.accentColor};">${content.iconEmoji}</span>
              </div>
            </td>
          </tr>
          
          <tr>
            <td align="center" style="padding: 0 40px 12px;">
              <h1 style="font-size: 24px; font-weight: 700; color: #ffffff; margin: 0; font-family: Georgia, serif;">${content.title}</h1>
            </td>
          </tr>
          
          <tr>
            <td align="center" style="padding: 0 40px 28px;">
              <p style="font-size: 14px; color: #737373; margin: 0;">${content.subtitle}</p>
            </td>
          </tr>
          
          <!-- Body Text -->
          <tr>
            <td style="padding: 0 40px 24px;">
              ${content.message}
            </td>
          </tr>
          
          <!-- Closing -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <p style="margin: 0; font-size: 15px; color: #a3a3a3; line-height: 1.7;">
                Best regards,<br>
                <strong style="color: #e4e4e7;">The Eclipse Team</strong>
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

    logStep("Sending status update email");

    const emailResponse = await resend.emails.send({
      from: "Eclipse <noreply@eclipserblx.com>",
      to: [applicant_email],
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
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
