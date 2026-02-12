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
        subject: `Your application for ${position} has been accepted`,
        title: 'Application accepted',
        message: `
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">Hi ${applicant_name},</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
            Your application for the <strong style="color: #e4e4e7;">${position}</strong> position has been accepted.
          </p>
          ${custom_message ? `<p style="margin: 0 0 16px 0; font-size: 14px; color: #a3a3a3; line-height: 1.6;"><strong style="color: #e4e4e7;">From our team:</strong> ${custom_message}</p>` : ''}
          <p style="margin: 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
            Someone from our team will be in touch with next steps. In the meantime, check the <a href="https://eclipserblx.com/jobs" style="color: #a855f7; text-decoration: none;">Jobs page</a> for any messages.
          </p>
        `,
      };
    case 'rejected':
      return {
        subject: `Update on your ${position} application`,
        title: 'Application update',
        message: `
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">Hi ${applicant_name},</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
            Thanks for applying for the <strong style="color: #e4e4e7;">${position}</strong> position. After reviewing your application, we've decided to move forward with other candidates whose experience is a closer fit for what we need right now.
          </p>
          ${custom_message ? `<p style="margin: 0 0 16px 0; font-size: 14px; color: #a3a3a3; line-height: 1.6;"><strong style="color: #e4e4e7;">Feedback:</strong> ${custom_message}</p>` : ''}
          <p style="margin: 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
            You're welcome to apply again in the future. Keep an eye on our <a href="https://eclipserblx.com/jobs" style="color: #a855f7; text-decoration: none;">Jobs page</a> for new openings.
          </p>
        `,
      };
    case 'reviewing':
      return {
        subject: `Your ${position} application is under review`,
        title: 'Application under review',
        message: `
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">Hi ${applicant_name},</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
            Your application for the <strong style="color: #e4e4e7;">${position}</strong> position is now being reviewed by our team.
          </p>
          ${custom_message ? `<p style="margin: 0 0 16px 0; font-size: 14px; color: #a3a3a3; line-height: 1.6;"><strong style="color: #e4e4e7;">Note:</strong> ${custom_message}</p>` : ''}
          <p style="margin: 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
            We'll be in touch with an update soon. You can check your status on the <a href="https://eclipserblx.com/jobs" style="color: #a855f7; text-decoration: none;">Jobs page</a>.
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