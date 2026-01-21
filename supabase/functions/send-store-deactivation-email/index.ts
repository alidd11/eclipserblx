import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeactivationEmailRequest {
  store_id: string;
  reason?: string;
}

function logStep(step: string, details?: Record<string, unknown>) {
  console.log(`[STORE-DEACTIVATION-EMAIL] ${step}`, details ? JSON.stringify(details) : '');
}

function generateEmailHtml(storeName: string, ownerName: string, reason?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Store Deactivation Notice</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px 40px; border-radius: 12px 12px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                    Store Deactivation Notice
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="background-color: #18181b; padding: 40px; border-radius: 0 0 12px 12px;">
                  <p style="margin: 0 0 20px; color: #e4e4e7; font-size: 16px; line-height: 1.6;">
                    Hello ${ownerName},
                  </p>
                  
                  <p style="margin: 0 0 20px; color: #e4e4e7; font-size: 16px; line-height: 1.6;">
                    We're writing to inform you that your store <strong style="color: #a855f7;">${storeName}</strong> has been temporarily deactivated by our admin team.
                  </p>
                  
                  ${reason ? `
                  <div style="background-color: #27272a; border-left: 4px solid #a855f7; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                    <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Reason
                    </p>
                    <p style="margin: 0; color: #e4e4e7; font-size: 14px; line-height: 1.5;">
                      ${reason}
                    </p>
                  </div>
                  ` : ''}
                  
                  <p style="margin: 20px 0; color: #e4e4e7; font-size: 16px; line-height: 1.6;">
                    While your store is deactivated:
                  </p>
                  
                  <ul style="margin: 0 0 20px; padding-left: 20px; color: #a1a1aa; font-size: 14px; line-height: 1.8;">
                    <li>Your products will not be visible to customers</li>
                    <li>Customers cannot make purchases from your store</li>
                    <li>Your existing orders and earnings are preserved</li>
                    <li>You can still access your seller dashboard</li>
                  </ul>
                  
                  <p style="margin: 20px 0; color: #e4e4e7; font-size: 16px; line-height: 1.6;">
                    If you believe this was done in error or would like to discuss reactivation, please contact our support team.
                  </p>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="https://roleplay-hub-shop.lovable.app/contact" 
                       style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      Contact Support
                    </a>
                  </div>
                  
                  <!-- Footer -->
                  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #27272a;">
                    <p style="margin: 0; color: #71717a; font-size: 12px; text-align: center;">
                      This is an automated message from Eclipse. Please do not reply directly to this email.
                    </p>
                  </div>
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

  try {
    const { store_id, reason }: DeactivationEmailRequest = await req.json();
    logStep("Processing deactivation email request", { store_id });

    if (!store_id) {
      throw new Error("store_id is required");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get store details with owner info
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("name, owner_id")
      .eq("id", store_id)
      .single();

    if (storeError || !store) {
      logStep("Store not found", { error: storeError });
      throw new Error("Store not found");
    }

    // Get owner profile separately
    const { data: ownerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("user_id", store.owner_id)
      .single();

    if (profileError || !ownerProfile?.email) {
      logStep("Owner email not found", { error: profileError });
      throw new Error("Store owner email not found");
    }

    const ownerName = ownerProfile.display_name || "Seller";
    const ownerEmail = ownerProfile.email;
    const storeName = store.name;

    logStep("Sending deactivation email", { ownerEmail, storeName });

    const emailHtml = generateEmailHtml(storeName, ownerName, reason);

    const emailResponse = await resend.emails.send({
      from: "Eclipse <noreply@eclipserblx.com>",
      to: [ownerEmail],
      subject: `Your store "${storeName}" has been deactivated`,
      html: emailHtml,
    });

    logStep("Email sent successfully", { emailResponse });

    return new Response(
      JSON.stringify({ success: true, message: "Deactivation email sent" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Error sending deactivation email", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
