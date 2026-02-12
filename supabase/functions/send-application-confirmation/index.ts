import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApplicationConfirmationRequest {
  applicant_name: string;
  applicant_email: string;
  position: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[SEND-APPLICATION-CONFIRMATION] ${step}`, details ? JSON.stringify(details) : '');
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicant_name, applicant_email, position }: ApplicationConfirmationRequest = await req.json();
    
    logStep("Received request", { applicant_name, applicant_email, position });

    if (!applicant_email || !applicant_name || !position) {
      throw new Error("Missing required fields: applicant_name, applicant_email, or position");
    }

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
              <h1 style="font-size: 22px; font-weight: 600; color: #ffffff; margin: 0 0 20px 0;">Application received</h1>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                Hi ${applicant_name},
              </p>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
                We've got your application for the <strong style="color: #e4e4e7;">${position}</strong> position. Our team will take a look and get back to you.
              </p>
              <p style="margin: 0 0 4px 0; color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">What happens next</p>
              <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #a3a3a3; font-size: 14px; line-height: 1.8;">
                <li>Our recruiting team reviews your application</li>
                <li>You may get messages from us with updates</li>
                <li>Check your status on the <a href="https://eclipserblx.com/jobs" style="color: #a855f7; text-decoration: none;">Jobs page</a></li>
              </ul>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #a3a3a3; line-height: 1.6;">
                If we need more info, we'll reach out to this email. Please allow up to 7 business days.
              </p>
              <p style="margin: 0; font-size: 15px; color: #a3a3a3; line-height: 1.6;">
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

    logStep("Sending confirmation email");

    const emailResponse = await resend.emails.send({
      from: "Eclipse <noreply@eclipserblx.com>",
      to: [applicant_email],
      subject: `Application received - ${position}`,
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