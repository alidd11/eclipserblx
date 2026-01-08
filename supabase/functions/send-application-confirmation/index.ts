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
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse;">
          
          <!-- Logo Section -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background: linear-gradient(180deg, rgba(16, 185, 129, 0.1) 0%, rgba(10, 10, 15, 0.95) 100%); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 16px; padding: 40px 32px;">
              
              <!-- Title -->
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">
                Application Received!
              </h1>
              
              <p style="margin: 0 0 32px 0; font-size: 14px; color: #a1a1aa; text-align: center;">
                Thank you for applying to join our team
              </p>

              <!-- Greeting -->
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #e4e4e7; line-height: 1.6;">
                Hi ${applicant_name},
              </p>

              <!-- Message -->
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #a1a1aa; line-height: 1.7;">
                We've received your application for the <strong style="color: #10b981;">${position}</strong> position at Eclipse. Our team will review your application carefully.
              </p>

              <!-- What's Next Box -->
              <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #10b981;">What's Next?</h3>
                <ul style="margin: 0; padding-left: 20px; color: #a1a1aa; font-size: 14px; line-height: 1.8;">
                  <li>Our recruiting team will review your application</li>
                  <li>You may receive messages from us with updates</li>
                  <li>You can check your status anytime on our <a href="https://eclipserblx.com/jobs" style="color: #10b981; text-decoration: none;">Jobs page</a></li>
                </ul>
              </div>

              <p style="margin: 0 0 24px 0; font-size: 15px; color: #a1a1aa; line-height: 1.7;">
                If we need more information, we'll reach out via the email you provided. Please allow up to 7 business days for a response.
              </p>

              <!-- Closing -->
              <p style="margin: 0; font-size: 15px; color: #a1a1aa; line-height: 1.7;">
                Best of luck,<br>
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
