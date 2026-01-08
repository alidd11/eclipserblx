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
        icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        iconBg: 'linear-gradient(135deg, #10b981, #059669)',
        title: 'Congratulations! 🎉',
        subtitle: 'Your application has been accepted',
        message: `
          <p style="margin: 0 0 24px 0; font-size: 16px; color: #e4e4e7; line-height: 1.6;">
            Hi ${applicant_name},
          </p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #a1a1aa; line-height: 1.7;">
            Great news! We're thrilled to inform you that your application for the <strong style="color: #10b981;">${position}</strong> position has been <strong style="color: #10b981;">accepted</strong>!
          </p>
          ${custom_message ? `
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #10b981;">Message from our team:</h3>
            <p style="margin: 0; color: #e4e4e7; font-size: 14px; line-height: 1.7;">${custom_message}</p>
          </div>
          ` : ''}
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #a1a1aa; line-height: 1.7;">
            A member of our team will be in touch shortly with next steps. In the meantime, feel free to check the <a href="https://eclipserblx.com/jobs" style="color: #10b981; text-decoration: none;">Jobs page</a> for any messages.
          </p>
        `,
      };
    case 'rejected':
      return {
        subject: `Update on Your ${position} Application`,
        icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
        iconBg: 'linear-gradient(135deg, #6b7280, #4b5563)',
        title: 'Application Update',
        subtitle: 'Thank you for your interest in Eclipse',
        message: `
          <p style="margin: 0 0 24px 0; font-size: 16px; color: #e4e4e7; line-height: 1.6;">
            Hi ${applicant_name},
          </p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #a1a1aa; line-height: 1.7;">
            Thank you for taking the time to apply for the <strong style="color: #a1a1aa;">${position}</strong> position at Eclipse.
          </p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #a1a1aa; line-height: 1.7;">
            After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current needs. This was a difficult decision, as we received many qualified applications.
          </p>
          ${custom_message ? `
          <div style="background: rgba(107, 114, 128, 0.1); border: 1px solid rgba(107, 114, 128, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #9ca3af;">Feedback from our team:</h3>
            <p style="margin: 0; color: #e4e4e7; font-size: 14px; line-height: 1.7;">${custom_message}</p>
          </div>
          ` : ''}
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #a1a1aa; line-height: 1.7;">
            We encourage you to apply again in the future when new opportunities arise. Keep an eye on our <a href="https://eclipserblx.com/jobs" style="color: #10b981; text-decoration: none;">Jobs page</a> for upcoming openings.
          </p>
        `,
      };
    case 'reviewing':
      return {
        subject: `Your ${position} Application is Under Review`,
        icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
        iconBg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        title: 'Application Under Review',
        subtitle: 'We\'re reviewing your application',
        message: `
          <p style="margin: 0 0 24px 0; font-size: 16px; color: #e4e4e7; line-height: 1.6;">
            Hi ${applicant_name},
          </p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #a1a1aa; line-height: 1.7;">
            Your application for the <strong style="color: #3b82f6;">${position}</strong> position is now being actively reviewed by our team.
          </p>
          ${custom_message ? `
          <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #3b82f6;">Note from our team:</h3>
            <p style="margin: 0; color: #e4e4e7; font-size: 14px; line-height: 1.7;">${custom_message}</p>
          </div>
          ` : ''}
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #a1a1aa; line-height: 1.7;">
            We'll be in touch soon with an update. You can check your application status anytime on our <a href="https://eclipserblx.com/jobs" style="color: #10b981; text-decoration: none;">Jobs page</a>.
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
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse;">
          
          <!-- Logo Section -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <div style="width: 56px; height: 56px; background: ${content.iconBg}; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                ${content.icon}
              </div>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background: linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(10, 10, 15, 0.95) 100%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 40px 32px;">
              
              <!-- Title -->
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">
                ${content.title}
              </h1>
              
              <p style="margin: 0 0 32px 0; font-size: 14px; color: #a1a1aa; text-align: center;">
                ${content.subtitle}
              </p>

              ${content.message}

              <!-- Closing -->
              <p style="margin: 0; font-size: 15px; color: #a1a1aa; line-height: 1.7;">
                Best regards,<br>
                <strong style="color: #e4e4e7;">The Eclipse Team</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #52525b;">
                Eclipse - Premium Roblox Assets
              </p>
              <p style="margin: 0; font-size: 11px; color: #3f3f46;">
                <a href="https://eclipserblx.com" style="color: #10b981; text-decoration: none;">eclipserblx.com</a>
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
