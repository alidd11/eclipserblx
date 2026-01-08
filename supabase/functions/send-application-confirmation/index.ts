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
  <title>Application Received - Eclipse</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #050505;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="max-width: 520px; background: linear-gradient(180deg, #0f0f0f 0%, #0a0a0a 100%); border: 1px solid #1a1a1a; border-radius: 16px; overflow: hidden;">
          
          <!-- Header with gradient accent -->
          <tr>
            <td style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 50%, transparent 100%); padding: 32px 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); width: 44px; height: 44px; border-radius: 10px; text-align: center; vertical-align: middle;">
                          <span style="font-size: 22px; font-weight: 800; color: #ffffff; font-family: Georgia, serif;">E</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: 'Cinzel', Georgia, serif;">ECLIPSE</span>
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
              <div style="width: 64px; height: 64px; background: rgba(16, 185, 129, 0.1); border: 2px solid rgba(16, 185, 129, 0.3); border-radius: 50%; display: inline-block; line-height: 60px; text-align: center;">
                <span style="font-size: 28px; line-height: 64px;">✓</span>
              </div>
            </td>
          </tr>
          
          <tr>
            <td align="center" style="padding: 0 40px 12px;">
              <h1 style="font-size: 24px; font-weight: 700; color: #ffffff; margin: 0; font-family: 'Cinzel', Georgia, serif;">Application Received!</h1>
            </td>
          </tr>
          
          <tr>
            <td align="center" style="padding: 0 40px 28px;">
              <p style="font-size: 14px; color: #737373; margin: 0;">Thank you for applying to join our team</p>
            </td>
          </tr>
          
          <!-- Body Text -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #e4e4e7; line-height: 1.6;">
                Hi ${applicant_name},
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #a3a3a3; line-height: 1.7;">
                We've received your application for the <strong style="color: #10b981;">${position}</strong> position at Eclipse. Our team will review your application carefully.
              </p>
            </td>
          </tr>
          
          <!-- What's Next Box -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #10b981;">What's Next?</h3>
                    <table role="presentation" cellspacing="0" cellpadding="0" style="color: #a3a3a3; font-size: 14px;">
                      <tr><td style="padding: 4px 0;">• Our recruiting team will review your application</td></tr>
                      <tr><td style="padding: 4px 0;">• You may receive messages from us with updates</td></tr>
                      <tr><td style="padding: 4px 0;">• Check your status on our <a href="https://eclipserblx.com/jobs" style="color: #10b981; text-decoration: none;">Jobs page</a></td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 40px 24px;">
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #a3a3a3; line-height: 1.7;">
                If we need more information, we'll reach out via the email you provided. Please allow up to 7 business days for a response.
              </p>
              <p style="margin: 0; font-size: 15px; color: #a3a3a3; line-height: 1.7;">
                Best of luck,<br>
                <strong style="color: #e4e4e7;">The Eclipse Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: none; border-top: 1px solid #1f1f1f; margin: 0;">
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 40px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-right: 20px;">
                    <a href="https://eclipserblx.com" style="font-size: 12px; color: #10b981; text-decoration: none;">Website</a>
                  </td>
                  <td style="border-left: 1px solid #333; padding-left: 20px; padding-right: 20px;">
                    <a href="https://eclipserblx.com/support" style="font-size: 12px; color: #10b981; text-decoration: none;">Support</a>
                  </td>
                  <td style="border-left: 1px solid #333; padding-left: 20px;">
                    <a href="https://eclipserblx.com/privacy-policy" style="font-size: 12px; color: #10b981; text-decoration: none;">Privacy</a>
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

    logStep("Sending confirmation email");

    const emailResponse = await resend.emails.send({
      from: "Eclipse <noreply@eclipserblx.com>",
      to: [applicant_email],
      subject: `Application Received - ${position}`,
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
